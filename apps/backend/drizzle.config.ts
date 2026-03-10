import type { Config } from 'drizzle-kit';
import { resolve } from 'node:path';

const localDb = `file:${resolve(import.meta.dir, 'local.db')}`;

export default {
  schema: './src/infrastructure/db/schema.ts',
  out: './src/infrastructure/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || localDb,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
