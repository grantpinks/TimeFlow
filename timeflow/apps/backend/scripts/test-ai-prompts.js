import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { parsePrompts, evaluateExpectation, shouldFailRun } from './aiRegressionUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptsPath =
  process.env.AI_REGRESSION_PROMPTS ||
  path.join(__dirname, 'prompts', 'sprint13-regression.txt');
const endpoint =
  process.env.AI_REGRESSION_ENDPOINT || 'http://localhost:3001/api/assistant/chat';
let token = process.env.AI_REGRESSION_TOKEN;
const email = process.env.AI_REGRESSION_USER_EMAIL;
const delayMs = parseInt(process.env.PROMPT_DELAY_MS || '0', 10);
const reportDir =
  process.env.AI_REGRESSION_REPORT_DIR || path.join(__dirname, 'reports');
const inboxEmail = process.env.AI_REGRESSION_INBOX_EMAIL || email;
const apiBase = (() => {
  if (process.env.AI_REGRESSION_API_BASE) {
    return process.env.AI_REGRESSION_API_BASE.replace(/\/$/, '');
  }
  try {
    const url = new URL(endpoint);
    const basePath = url.pathname.replace(/\/api\/assistant\/chat.*$/, '/api');
    return `${url.origin}${basePath}`;
  } catch {
    return 'http://localhost:3001/api';
  }
})();

async function getTokenFromEmail(userEmail) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is required to generate a token.');
  }

  const prisma = new PrismaClient();
  const server = fastify();
  await server.register(fastifyJwt, { secret });

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true },
  });

  if (!user) {
    await prisma.$disconnect();
    await server.close();
    throw new Error(`User not found for email: ${userEmail}`);
  }

  const signedToken = await server.jwt.sign({ sub: user.id, type: 'access' });
  await prisma.$disconnect();
  await server.close();
  return signedToken;
}

async function delay(ms) {
  if (ms <= 0) return;
  await new Promise(resolve => setTimeout(resolve, ms));
}

function withHistoryMetadata(history) {
  return history.map((entry, index) => ({
    id: entry.id || `regression_${Date.now()}_${index}`,
    role: entry.role,
    content: entry.content,
    timestamp: entry.timestamp || new Date().toISOString(),
    ...(entry.metadata ? { metadata: entry.metadata } : {}),
  }));
}

async function runPrompt(prompt, conversationHistory = []) {
  const start = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: prompt,
        conversationHistory:
          conversationHistory.length > 0 ? withHistoryMetadata(conversationHistory) : undefined,
      }),
    });

    const durationMs = Date.now() - start;
    const bodyText = await response.text();

    let bodyJson = null;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch (error) {
      return {
        prompt,
        status: response.status,
        ok: response.ok,
        durationMs,
        preview: false,
        blocksCount: 0,
        conflictsCount: 0,
        confidence: null,
        messageContent: null,
        error: `Failed to parse JSON response: ${String(error)}`,
      };
    }

    const preview = Boolean(bodyJson?.suggestions);
    const blocksCount = Array.isArray(bodyJson?.suggestions?.blocks)
      ? bodyJson.suggestions.blocks.length
      : 0;
    const conflictsCount = Array.isArray(bodyJson?.suggestions?.conflicts)
      ? bodyJson.suggestions.conflicts.length
      : 0;
    const confidence = bodyJson?.suggestions?.confidence || null;
    const messageContent =
      typeof bodyJson?.message?.content === 'string' ? bodyJson.message.content : null;

    return {
      prompt,
      status: response.status,
      ok: response.ok,
      durationMs,
      preview,
      blocksCount,
      conflictsCount,
      confidence,
      draft: false,
      confirmCta: null,
      messageContent,
    };
  } catch (error) {
    return {
      prompt,
      status: 0,
      ok: false,
      durationMs: Date.now() - start,
      preview: false,
      blocksCount: 0,
      conflictsCount: 0,
      confidence: null,
      draft: false,
      confirmCta: null,
      messageContent: null,
      error: String(error),
    };
  }
}

async function getLatestInboxEmailId() {
  if (!inboxEmail) {
    throw new Error('AI_REGRESSION_INBOX_EMAIL or AI_REGRESSION_USER_EMAIL is required for inbox checks.');
  }
  const response = await fetch(`${apiBase}/email/inbox?maxResults=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Inbox fetch failed: ${response.status} ${errorText}`);
  }
  const body = await response.json();
  const message = Array.isArray(body?.messages) ? body.messages[0] : null;
  if (!message?.id) {
    throw new Error('No inbox messages found for regression inbox checks.');
  }
  return message.id;
}

async function runInboxDraft(endpointKey) {
  const start = Date.now();
  try {
    const emailId = await getLatestInboxEmailId();
    const pathMap = {
      'inbox-task-draft': '/email/ai/task-draft',
      'inbox-label-sync': '/email/ai/label-sync',
      'inbox-label-explain': '/email/ai/label-explain',
    };
    const path = pathMap[endpointKey];
    if (!path) {
      throw new Error(`Unknown inbox endpoint: ${endpointKey}`);
    }

    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emailId }),
    });

    const durationMs = Date.now() - start;
    const bodyText = await response.text();
    let bodyJson = null;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch (error) {
      return {
        prompt: endpointKey,
        status: response.status,
        ok: response.ok,
        durationMs,
        preview: false,
        blocksCount: 0,
        conflictsCount: 0,
        confidence: null,
        draft: false,
        confirmCta: null,
        messageContent: null,
        error: `Failed to parse JSON response: ${String(error)}`,
      };
    }

    const draft = Boolean(bodyJson?.draft);
    const confirmCta = typeof bodyJson?.confirmCta === 'string' ? bodyJson.confirmCta : null;
    const messageContent = [
      confirmCta,
      bodyJson?.draft?.reason,
      bodyJson?.draft?.explanation,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      prompt: endpointKey,
      status: response.status,
      ok: response.ok,
      durationMs,
      preview: false,
      blocksCount: 0,
      conflictsCount: 0,
      confidence: null,
      draft,
      confirmCta,
      messageContent,
    };
  } catch (error) {
    return {
      prompt: endpointKey,
      status: 0,
      ok: false,
      durationMs: Date.now() - start,
      preview: false,
      blocksCount: 0,
      conflictsCount: 0,
      confidence: null,
      draft: false,
      confirmCta: null,
      messageContent: null,
      error: String(error),
    };
  }
}

async function main() {
  if (!token && email) {
    token = await getTokenFromEmail(email);
  }

  if (!token) {
    console.error('Missing AI_REGRESSION_TOKEN or AI_REGRESSION_USER_EMAIL env var.');
    process.exit(1);
  }

  const raw = await fs.readFile(promptsPath, 'utf8');
  const prompts = parsePrompts(raw);

  if (prompts.length === 0) {
    console.error(`No prompts found in ${promptsPath}`);
    process.exit(1);
  }

  const results = [];

  for (const entry of prompts) {
    if (entry.type === 'flow') {
      const history = [];
      const turns = [];
      console.log(`[FLOW] ${entry.name} (${entry.prompts.length} turns)`);
      for (const prompt of entry.prompts) {
        const result = await runPrompt(prompt, history);
        const { messageContent, ...record } = result;
        const messagePreview =
          typeof messageContent === 'string'
            ? messageContent.trim().slice(0, 240)
            : null;
        const expectation = entry.turnExpectations?.[turns.length + 1];
        const expectationResult = evaluateExpectation(record, expectation, messageContent);
        const turnOk = record.ok && expectationResult.ok;
        turns.push({
          ...record,
          messagePreview,
          expectation,
          expectationOk: expectationResult.ok,
          expectationFailures: expectationResult.reasons,
          ok: turnOk,
        });
        const statusLabel = turnOk ? 'OK' : 'FAIL';
        console.log(
          `  [${statusLabel}] ${record.status} | preview=${record.preview} blocks=${record.blocksCount} | ${prompt}`
        );
        if (!expectationResult.ok && expectation) {
          console.log(`    [EXPECT-FAIL] ${expectationResult.reasons.join('; ')}`);
        }
        if (messageContent !== null) {
          history.push({ role: 'user', content: prompt });
          history.push({ role: 'assistant', content: messageContent });
        }
        await delay(delayMs);
      }
      const lastTurn = turns[turns.length - 1];
      const flowOk = turns.every(turn => turn.ok);
      results.push({
        flow: entry.name,
        ok: flowOk,
        status: lastTurn?.status ?? 0,
        preview: lastTurn?.preview ?? false,
        blocksCount: lastTurn?.blocksCount ?? 0,
        conflictsCount: lastTurn?.conflictsCount ?? 0,
        confidence: lastTurn?.confidence ?? null,
        turns,
      });
    } else {
      const result = entry.endpoint
        ? await runInboxDraft(entry.endpoint)
        : await runPrompt(entry.prompt);
      const { messageContent, ...record } = result;
      const messagePreview =
        typeof messageContent === 'string'
          ? messageContent.trim().slice(0, 240)
          : null;
      const expectationResult = evaluateExpectation(record, entry.expect, messageContent);
      const recordOk = record.ok && expectationResult.ok;
      results.push({
        ...record,
        ok: recordOk,
        messagePreview,
        expectation: entry.expect,
        expectationOk: expectationResult.ok,
        expectationFailures: expectationResult.reasons,
      });
      const statusLabel = recordOk ? 'OK' : 'FAIL';
      console.log(
        `[${statusLabel}] ${record.status} | preview=${record.preview} blocks=${record.blocksCount} | ${entry.endpoint || entry.prompt}`
      );
      if (!expectationResult.ok && entry.expect) {
        console.log(`  [EXPECT-FAIL] ${expectationResult.reasons.join('; ')}`);
      }
      await delay(delayMs);
    }
  }

  await fs.mkdir(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath =
    process.env.AI_REGRESSION_REPORT_PATH ||
    path.join(reportDir, `ai-regression-${timestamp}.json`);

  const summary = {
    total: results.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    previews: results.filter(r => r.preview).length,
    turnsTotal: results.reduce((total, result) => total + (result.turns ? result.turns.length : 1), 0),
    turnsPreviews: results.reduce((total, result) => {
      if (result.turns) {
        return total + result.turns.filter(turn => turn.preview).length;
      }
      return total + (result.preview ? 1 : 0);
    }, 0),
    expectationFailures: results.reduce((total, result) => {
      if (result.turns) {
        return total + result.turns.filter(turn => turn.expectationOk === false).length;
      }
      return total + (result.expectationOk === false ? 1 : 0);
    }, 0),
    timestamp: new Date().toISOString(),
    endpoint,
  };

  await fs.writeFile(
    reportPath,
    JSON.stringify({ summary, results }, null, 2)
  );

  console.log(`Report written: ${reportPath}`);

  if (shouldFailRun(summary)) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('AI regression harness failed:', error);
  process.exit(1);
});
