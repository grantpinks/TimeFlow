import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';

type PromptResult = {
  prompt: string;
  status: number;
  ok: boolean;
  durationMs: number;
  preview: boolean;
  blocksCount: number;
  conflictsCount: number;
  confidence: string | null;
  error?: string;
};

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

async function getTokenFromEmail(userEmail: string): Promise<string> {
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

function parsePrompts(raw: string): string[] {
  return raw
    .split(/\n---\n/g)
    .map(section =>
      section
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
        .join('\n')
        .trim()
    )
    .filter(Boolean);
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function runPrompt(prompt: string): Promise<PromptResult> {
  const start = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: prompt }),
    });

    const durationMs = Date.now() - start;
    const bodyText = await response.text();

    let bodyJson: any = null;
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

    return {
      prompt,
      status: response.status,
      ok: response.ok,
      durationMs,
      preview,
      blocksCount,
      conflictsCount,
      confidence,
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
      error: String(error),
    };
  }
}

async function main(): Promise<void> {
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

  const results: PromptResult[] = [];

  for (const prompt of prompts) {
    const result = await runPrompt(prompt);
    results.push(result);
    const statusLabel = result.ok ? 'OK' : 'FAIL';
    console.log(
      `[${statusLabel}] ${result.status} | preview=${result.preview} blocks=${result.blocksCount} | ${prompt}`
    );
    await delay(delayMs);
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
    timestamp: new Date().toISOString(),
    endpoint,
  };

  await fs.writeFile(
    reportPath,
    JSON.stringify({ summary, results }, null, 2)
  );

  console.log(`Report written: ${reportPath}`);
}

main().catch(error => {
  console.error('AI regression harness failed:', error);
  process.exit(1);
});
