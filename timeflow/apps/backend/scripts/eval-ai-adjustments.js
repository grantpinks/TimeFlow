import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adjustmentsDir =
  process.env.AI_ADJUSTMENTS_DIR ||
  path.resolve(__dirname, '../../../../AI Response Adjustments');
const endpoint =
  process.env.AI_REGRESSION_ENDPOINT || 'http://localhost:3001/api/assistant/chat';
let token = process.env.AI_REGRESSION_TOKEN;
const email = process.env.AI_REGRESSION_USER_EMAIL;
const delayMs = parseInt(process.env.PROMPT_DELAY_MS || '0', 10);
const reportDir =
  process.env.AI_OFFLINE_EVAL_REPORT_DIR || path.join(__dirname, 'reports');

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

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseConversationFile(contents, filePath) {
  const lines = contents.split(/\r?\n/);
  const prompts = [];
  const notes = [];
  let header = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!header && /^convo\s+/i.test(trimmed)) {
      header = trimmed;
    }

    if (/^user\s*:/i.test(trimmed)) {
      const prompt = trimmed.replace(/^user\s*:/i, '').trim();
      if (prompt) {
        prompts.push(prompt);
      }
      continue;
    }

    if (/^##/.test(trimmed) || /^note\s*:/i.test(trimmed)) {
      notes.push(trimmed.replace(/^##\s*/, '').trim());
    }
  }

  return {
    id: path.relative(adjustmentsDir, filePath),
    header,
    prompts,
    notes,
  };
}

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function scoreResponse(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      overall: 0,
      scannability: 0,
      leakScore: 0,
      violations: ['empty_response'],
      stats: {
        length: 0,
        paragraphs: 0,
        bullets: 0,
        headings: 0,
        maxParagraphChars: 0,
        avgParagraphChars: 0,
        longLineCount: 0,
      },
    };
  }

  const lines = trimmed.split(/\r?\n/);
  const paragraphs = trimmed
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean);
  const bulletCount = lines.filter(line => /^\s*([-*]|\d+\.)\s+/.test(line)).length;
  const headingCount = lines.filter(line => /^#{1,6}\s+/.test(line)).length;
  const longLineCount = lines.filter(line => line.length > 140).length;
  const maxParagraphChars = paragraphs.reduce((max, p) => Math.max(max, p.length), 0);
  const avgParagraphChars =
    paragraphs.reduce((sum, p) => sum + p.length, 0) / Math.max(1, paragraphs.length);

  let scannability = 100;
  if (paragraphs.length <= 1) scannability -= 20;
  if (maxParagraphChars > 500) scannability -= 25;
  if (avgParagraphChars > 300) scannability -= 10;
  if (longLineCount > 3) scannability -= 10;
  if (bulletCount >= 2) scannability += 10;
  if (headingCount >= 1) scannability += 10;
  scannability = clampScore(scannability);

  const violations = [];
  const leakPatterns = [
    { id: 'structured_output_leak', regex: /\[STRUCTURED_OUTPUT\]/i },
    { id: 'code_fence_leak', regex: /```/ },
    { id: 'json_blob', regex: /^\s*\{[\s\S]*\}\s*$/ },
    { id: 'assistant_mode_leak', regex: /mode\s*:/i },
  ];

  for (const pattern of leakPatterns) {
    if (pattern.regex.test(trimmed)) {
      violations.push(pattern.id);
    }
  }

  let leakScore = 100 - violations.length * 25;
  leakScore = clampScore(leakScore);

  const overall = Math.round(scannability * 0.7 + leakScore * 0.3);

  return {
    overall,
    scannability,
    leakScore,
    violations,
    stats: {
      length: trimmed.length,
      paragraphs: paragraphs.length,
      bullets: bulletCount,
      headings: headingCount,
      maxParagraphChars,
      avgParagraphChars: Math.round(avgParagraphChars),
      longLineCount,
    },
  };
}

async function delay(ms) {
  if (ms <= 0) return;
  await new Promise(resolve => setTimeout(resolve, ms));
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
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
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

  const exists = await fs
    .access(adjustmentsDir)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    console.error(`AI adjustments directory not found: ${adjustmentsDir}`);
    process.exit(1);
  }

  const files = await listFiles(adjustmentsDir);
  if (files.length === 0) {
    console.error(`No files found in ${adjustmentsDir}`);
    process.exit(1);
  }

  const cases = [];
  const skipped = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = parseConversationFile(raw, filePath);

    if (parsed.prompts.length === 0) {
      skipped.push({
        file: parsed.id,
        reason: 'No user prompts found',
      });
      continue;
    }

    cases.push(parsed);
  }

  if (cases.length === 0) {
    console.error('No runnable cases found. Ensure files include "User:" lines.');
    process.exit(1);
  }

  const results = [];

  for (const entry of cases) {
    const history = [];
    const turns = [];
    console.log(`[EVAL] ${entry.id} (${entry.prompts.length} turns)`);

    for (const prompt of entry.prompts) {
      const result = await runPrompt(prompt, history);
      const { messageContent, ...record } = result;
      const score = scoreResponse(messageContent || '');
      turns.push({ ...record, score });

      const statusLabel = record.ok ? 'OK' : 'FAIL';
      console.log(
        `  [${statusLabel}] ${record.status} | score=${score.overall} preview=${record.preview} blocks=${record.blocksCount} | ${prompt}`
      );

      if (messageContent !== null) {
        history.push({ role: 'user', content: prompt });
        history.push({ role: 'assistant', content: messageContent });
      }

      await delay(delayMs);
    }

    const overallScore =
      turns.reduce((sum, turn) => sum + turn.score.overall, 0) /
      Math.max(1, turns.length);
    const scannabilityScore =
      turns.reduce((sum, turn) => sum + turn.score.scannability, 0) /
      Math.max(1, turns.length);
    const leakScore =
      turns.reduce((sum, turn) => sum + turn.score.leakScore, 0) /
      Math.max(1, turns.length);

    const lastTurn = turns[turns.length - 1];
    results.push({
      id: entry.id,
      header: entry.header,
      notes: entry.notes,
      ok: turns.every(turn => turn.ok),
      status: lastTurn?.status ?? 0,
      preview: lastTurn?.preview ?? false,
      blocksCount: lastTurn?.blocksCount ?? 0,
      conflictsCount: lastTurn?.conflictsCount ?? 0,
      confidence: lastTurn?.confidence ?? null,
      score: {
        overall: Math.round(overallScore),
        scannability: Math.round(scannabilityScore),
        leakScore: Math.round(leakScore),
      },
      turns,
    });
  }

  await fs.mkdir(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath =
    process.env.AI_OFFLINE_EVAL_REPORT_PATH ||
    path.join(reportDir, `ai-offline-eval-${timestamp}.json`);

  const allScores = results.flatMap(result =>
    result.turns.map(turn => turn.score)
  );
  const averageOverall =
    allScores.reduce((sum, score) => sum + score.overall, 0) /
    Math.max(1, allScores.length);
  const averageScannability =
    allScores.reduce((sum, score) => sum + score.scannability, 0) /
    Math.max(1, allScores.length);
  const averageLeak =
    allScores.reduce((sum, score) => sum + score.leakScore, 0) /
    Math.max(1, allScores.length);

  const summary = {
    totalCases: results.length,
    skippedCases: skipped.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    previews: results.filter(r => r.preview).length,
    turnsTotal: results.reduce((sum, result) => sum + result.turns.length, 0),
    averageOverallScore: Math.round(averageOverall),
    averageScannabilityScore: Math.round(averageScannability),
    averageLeakScore: Math.round(averageLeak),
    timestamp: new Date().toISOString(),
    endpoint,
    adjustmentsDir,
  };

  await fs.writeFile(
    reportPath,
    JSON.stringify({ summary, results, skipped }, null, 2)
  );

  console.log(`Report written: ${reportPath}`);
}

main().catch(error => {
  console.error('AI offline evaluation harness failed:', error);
  process.exit(1);
});
