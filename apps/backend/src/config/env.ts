import { z } from 'zod';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Bun loads .env from the process cwd, which in a monorepo is the workspace dir (apps/backend/).
// We also check the monorepo root so a single .env at the root works for all workspaces.
async function loadDotEnvFromRoot() {
  const rootEnv = resolve(import.meta.dir, '../../../../.env');
  if (existsSync(rootEnv)) {
    const file = Bun.file(rootEnv);
    const text = await file.text();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

await loadDotEnvFromRoot();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('./local.db'),
  JWT_SECRET: z.string().min(1),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
