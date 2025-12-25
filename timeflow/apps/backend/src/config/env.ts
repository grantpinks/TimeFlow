import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  DEFAULT_GOOGLE_CALENDAR_ID: z.string().optional(),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  APP_BASE_URL: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY is required (32+ chars)'),
  RATE_LIMIT_MAX: z.coerce.number().optional(),
  RATE_LIMIT_WINDOW: z.string().optional(),
  // AI Assistant (Local LLM)
  LLM_ENDPOINT: z.string().optional(),
  LLM_PROVIDER: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_MAX_TOKENS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  console.error('\n📋 Current environment variables:');
  console.error('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
  console.error('  SESSION_SECRET:', process.env.SESSION_SECRET ? '✓ Set' : '✗ Missing');
  console.error('  ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? `✓ Set (${process.env.ENCRYPTION_KEY.length} chars)` : '✗ Missing');
  console.error('  PORT:', process.env.PORT || '(using default 4000)');
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;


