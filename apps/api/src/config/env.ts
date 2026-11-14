import { config as loadEnvFile } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load a local `.env` for dev/local-prod testing. In real container/host
 * deployments the platform injects env vars directly, so a missing file is fine.
 * We probe a few likely locations because the compiled bundle can live at
 * different depths (src vs dist) than the repo root that holds `.env`.
 */
function loadLocalEnv(): void {
  const candidates = [
    process.env.DOTENV_CONFIG_PATH,
    path.join(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '..', '..', '.env'),
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      loadEnvFile({ path: file });
      return;
    }
  }
}

loadLocalEnv();

/** Reject known placeholder secrets so a real deploy can never boot with them. */
const PLACEHOLDER_SECRET = /change[-_]?me|placeholder|example|secret{2,}|^changeme/i;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),
    API_PREFIX: z.string().default('/api/v1'),
    MONGODB_URI: z.string().min(1),
    REDIS_URL: z.string().min(1).optional(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
    /** Comma-separated allow-list of web/admin origins for CORS (e.g. "https://app.x,https://admin.x"). */
    CORS_ORIGIN: z
      .string()
      .default('https://tayeralsaad.vercel.app,http://localhost:5173,http://localhost:3000'),
    WEB_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
    /** Meta WhatsApp Cloud API (optional; worker skips sends if unset). */
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_CLOUD_API_VERSION: z.string().default('v21.0'),
    /** Webhook verification (GET). */
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    /** Base URL for absolute links (e.g. uploaded files). Defaults to http://localhost:${PORT}. */
    PUBLIC_API_URL: z.string().url().optional(),
    /** Single bootstrap admin credential. Admins sign in with email + password (not OTP). */
    ADMIN_EMAIL: z.string().email().default('admin@tayralsaad.iq'),
    ADMIN_PASSWORD: z.string().min(6).default('admin123456'),
    /** Phone used to store/upsert the single admin user document. */
    ADMIN_PHONE: z.string().default('+964779000099'),
  })
  .superRefine((val, ctx) => {
    // In production, refuse default/placeholder JWT secrets and equal access/refresh secrets.
    if (val.NODE_ENV === 'production') {
      for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
        if (PLACEHOLDER_SECRET.test(val[key])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} looks like a placeholder — set a strong, unique secret in production.`,
          });
        }
      }
      if (val.JWT_ACCESS_SECRET === val.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET.',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
  process.stderr.write(
    [
      '',
      '[api] ── Invalid environment configuration ─────────────────────────',
      '[api] The API cannot start until these environment variables are fixed:',
      ...lines,
      '[api] See apps/api/.env.example for the full list and format.',
      '',
    ].join('\n') + '\n',
  );
  process.exit(1);
}

export const env: Env = parsed.data;
