# Database

## Stack

- **SQLite** — embedded database, no external server needed
- **Drizzle ORM** — type-safe query builder and schema definition
- **bun:sqlite** — Bun's native SQLite driver (faster than better-sqlite3)
- **drizzle-kit** — CLI for generating and running migrations

## Connection setup

The database client is configured in `apps/backend/src/infrastructure/db/client.ts`:

```ts
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { env } from '../../config/env';
import * as schema from './schema';

const sqlite = new Database(env.DATABASE_URL);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
```

### SQLite pragmas

Two pragmas are set at connection time:

**`journal_mode = WAL`** (Write-Ahead Logging): Allows concurrent reads while a write is happening. Without this, SQLite uses rollback journal mode where readers block writers and vice versa. WAL is the recommended mode for server applications.

**`foreign_keys = ON`**: SQLite has foreign key support but it's **disabled by default**. Without this pragma, you could insert a row with a `userId` that doesn't exist in the `users` table and SQLite wouldn't complain. This must be set on every connection (it's not persisted).

### DATABASE_URL

The `DATABASE_URL` environment variable points to the SQLite file. Default is `./local.db` (created in the backend working directory). For production, you'd typically use an absolute path.

## Table definitions

Tables are defined using Drizzle's schema API in each module's `[feature].table.ts` file. All tables are re-exported from a single barrel file so Drizzle can discover them.

### Users table (`auth.table.ts`)

```ts
export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

### Items table (`items.table.ts`)

```ts
export const itemsTable = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('inactive'),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

### Design decisions

**UUIDs as primary keys** (`text('id').primaryKey()`): We generate IDs in application code with `crypto.randomUUID()` rather than using SQLite's `INTEGER PRIMARY KEY AUTOINCREMENT`. This means IDs are assigned before insertion, which simplifies the domain layer — `Item.create()` can set the ID immediately without a round-trip to the database.

**Timestamps as integers** (`integer(..., { mode: 'timestamp' })`): SQLite doesn't have a native datetime type. Drizzle's `mode: 'timestamp'` stores dates as Unix timestamps (integers) and automatically converts to/from JavaScript `Date` objects.

**`$defaultFn` for defaults**: `.$defaultFn(() => new Date())` sets the default in application code, not in SQL. This is intentional — our domain entities set these values explicitly, so the SQL default is only a safety net.

**Foreign keys**: The `items.userId` references `usersTable.id`. Combined with the `foreign_keys = ON` pragma, this prevents orphaned items.

**Enums as text**: `text('status', { enum: ['active', 'inactive'] })` stores status as a string. SQLite doesn't have native enums, but Drizzle generates TypeScript types from the enum array, giving you compile-time safety.

## Schema barrel file

All table definitions must be exported from `apps/backend/src/infrastructure/db/schema.ts`:

```ts
export { usersTable } from '../../modules/auth/auth.table';
export { itemsTable } from '../../modules/items/items.table';
```

This file serves two purposes:
1. **Drizzle client** — passed to `drizzle(sqlite, { schema })` so the ORM knows about all tables
2. **drizzle-kit** — the migration generator reads this file to detect schema changes

When you add a new module, you must add its table export here.

## Migrations

### Drizzle Kit configuration

Defined in `apps/backend/drizzle.config.ts`:

```ts
export default {
  schema: './src/infrastructure/db/schema.ts',
  out: './src/infrastructure/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './local.db',
  },
} satisfies Config;
```

### Workflow

```bash
# 1. Make changes to table definitions in [feature].table.ts
# 2. Export new tables from schema.ts

# 3. Generate migration files
bun run db:generate

# 4. Review the generated SQL in infrastructure/db/migrations/

# 5. Apply migrations
bun run db:migrate
```

`db:generate` compares your current schema code against the last migration snapshot and produces a new SQL migration file. `db:migrate` applies all pending migrations to the database.

### Important notes

- Migrations are **forward-only**. Drizzle doesn't generate down migrations. For rollbacks, you'd write SQL manually or restore from backup.
- The migration files are committed to git. They represent the schema history.
- Never edit generated migration files after they've been applied. If you need to adjust, create a new migration.
- For development, you can delete `local.db` and re-run `db:migrate` to start fresh.

## Querying patterns

Repositories use Drizzle's query builder. Common patterns:

```ts
// Select one row
const row = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();

// Select multiple with pagination
const rows = await db
  .select()
  .from(itemsTable)
  .where(eq(itemsTable.userId, userId))
  .limit(limit)
  .offset(offset)
  .all();

// Count
const result = await db
  .select({ count: count() })
  .from(itemsTable)
  .where(eq(itemsTable.userId, userId))
  .get();

// Insert
await db.insert(usersTable).values({ id, email, name, passwordHash, createdAt });

// Update
await db
  .update(itemsTable)
  .set({ name, description, status, updatedAt })
  .where(and(eq(itemsTable.id, id), eq(itemsTable.userId, userId)));

// Delete
await db
  .delete(itemsTable)
  .where(and(eq(itemsTable.id, id), eq(itemsTable.userId, userId)));
```

Note the use of `and()` to scope queries by both `id` and `userId`. This ensures user isolation at the query level — a user can never accidentally access another user's data.

## Why SQLite

- **Zero ops**: No database server to manage. The database is a file.
- **Fast**: bun:sqlite is significantly faster than PostgreSQL for single-server workloads.
- **Good enough**: For personal projects and small-to-medium apps, SQLite handles thousands of concurrent users. You'd only need PostgreSQL for multi-server deployments or complex querying needs.
- **Easy to swap**: Since repositories abstract the data layer, migrating to PostgreSQL later means changing the Drizzle driver and table definitions, not business logic.
