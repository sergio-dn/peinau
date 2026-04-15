import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Upstash QStash
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),

  // SII API
  SII_API_URL: z.string().url().default('https://sii-api-916356778383.southamerica-east1.run.app'),
  SII_API_KEY: z.string().default(''),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32),

  // SMTP (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Slack (optional)
  SLACK_WEBHOOK_URL: z.string().url().optional(),

  // Self-reference for QStash callbacks
  API_BASE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
