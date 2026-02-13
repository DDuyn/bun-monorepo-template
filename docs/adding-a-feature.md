# Adding a Feature Module

This guide walks through adding a new backend feature module from scratch. We'll use a hypothetical `tags` module as the example — a simple entity with a name and color that belongs to a user.

## Overview of steps

1. Define Zod schemas in `@repo/shared`
2. Create the Drizzle table
3. Export the table from the schema barrel
4. Build the domain entity
5. Create the repository
6. Create the service
7. Create the Hono sub-app
8. Mount the route in `app.ts`
9. Write tests
10. Push schema to database

## Step 1: Shared schemas

Create `packages/shared/src/schemas/tag.schema.ts`:

```ts
import { z } from 'zod';

export const createTagInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color'),
});

export const updateTagInputSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const tagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string(),
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;
```

Then add the exports to `packages/shared/src/index.ts`:

```ts
export {
  createTagInputSchema,
  updateTagInputSchema,
  tagResponseSchema,
  type CreateTagInput,
  type UpdateTagInput,
  type TagResponse,
} from './schemas/tag.schema';
```

## Step 2: Drizzle table

Create `apps/backend/src/modules/tags/tags.table.ts`:

```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { usersTable } from '../auth/auth.table';

export const tagsTable = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6b7280'),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

## Step 3: Export from schema barrel

Add the table to `apps/backend/src/infrastructure/db/schema.ts`:

```ts
export { usersTable } from '../../modules/auth/auth.table';
export { itemsTable } from '../../modules/items/items.table';
export { tagsTable } from '../../modules/tags/tags.table';  // ← add this
```

This is necessary for Drizzle's migration generator to discover your table.

## Step 4: Domain entity

Create `apps/backend/src/modules/tags/tags.domain.ts`:

```ts
import { type Result, type AppError, ok, err, validationError } from '@repo/shared';
import type { TagResponse } from '@repo/shared';

export interface TagProps {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
}

export class Tag {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly userId: string;
  readonly createdAt: Date;

  private constructor(props: TagProps) {
    this.id = props.id;
    this.name = props.name;
    this.color = props.color;
    this.userId = props.userId;
    this.createdAt = props.createdAt;
  }

  static create(name: string, color: string, userId: string): Result<Tag, AppError> {
    if (name.trim().length === 0) {
      return err(validationError('Tag name cannot be empty'));
    }
    if (name.length > 50) {
      return err(validationError('Tag name cannot exceed 50 characters'));
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      return err(validationError('Color must be a valid hex color'));
    }

    return ok(new Tag({
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
      userId,
      createdAt: new Date(),
    }));
  }

  static fromPersistence(props: TagProps): Tag {
    return new Tag(props);
  }

  updateDetails(name?: string, color?: string): Result<Tag, AppError> {
    if (name !== undefined && name.trim().length === 0) {
      return err(validationError('Tag name cannot be empty'));
    }

    return ok(new Tag({
      id: this.id,
      name: name !== undefined ? name.trim() : this.name,
      color: color ?? this.color,
      userId: this.userId,
      createdAt: this.createdAt,
    }));
  }

  toResponse(): TagResponse {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
```

**Key points:**
- The constructor is `private`. The only ways to create a `Tag` are `Tag.create()` (validates) and `Tag.fromPersistence()` (trusts existing data).
- `create()` returns `Result`, so callers must handle the failure case.
- `toResponse()` produces the shape defined by `TagResponse` in the shared schemas — no `userId` exposed to the client.

## Step 5: Repository

Create `apps/backend/src/modules/tags/tags.repository.ts`:

```ts
import { eq, and } from 'drizzle-orm';
import type { DB } from '../../infrastructure/db/client';
import { tagsTable } from './tags.table';
import { Tag } from './tags.domain';

export interface TagsRepository {
  findById(id: string, userId: string): Promise<Tag | null>;
  findAllByUser(userId: string): Promise<Tag[]>;
  create(tag: Tag): Promise<void>;
  update(tag: Tag): Promise<void>;
  delete(id: string, userId: string): Promise<boolean>;
}

export function createTagsRepository(db: DB): TagsRepository {
  return {
    async findById(id, userId) {
      const row = await db
        .select()
        .from(tagsTable)
        .where(and(eq(tagsTable.id, id), eq(tagsTable.userId, userId)))
        .get();
      if (!row) return null;
      return Tag.fromPersistence(row);
    },

    async findAllByUser(userId) {
      const rows = await db
        .select()
        .from(tagsTable)
        .where(eq(tagsTable.userId, userId))
        .all();
      return rows.map((row) => Tag.fromPersistence(row));
    },

    async create(tag) {
      await db.insert(tagsTable).values({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        userId: tag.userId,
        createdAt: tag.createdAt,
      });
    },

    async update(tag) {
      await db
        .update(tagsTable)
        .set({ name: tag.name, color: tag.color })
        .where(and(eq(tagsTable.id, tag.id), eq(tagsTable.userId, tag.userId)));
    },

    async delete(id, userId) {
      const existing = await db
        .select({ id: tagsTable.id })
        .from(tagsTable)
        .where(and(eq(tagsTable.id, id), eq(tagsTable.userId, userId)))
        .get();
      if (!existing) return false;

      await db.delete(tagsTable).where(and(eq(tagsTable.id, id), eq(tagsTable.userId, userId)));
      return true;
    },
  };
}
```

**Pattern:** The repository interface uses domain types (`Tag`), not raw DB rows. This keeps the service layer decoupled from Drizzle. The factory function receives the `db` instance — same manual DI pattern used everywhere.

## Step 6: Service

Create `apps/backend/src/modules/tags/tags.service.ts`:

```ts
import {
  type Result, type AppError, type TagResponse,
  type CreateTagInput, type UpdateTagInput,
  ok, err, notFoundError,
} from '@repo/shared';
import { Tag } from './tags.domain';
import type { TagsRepository } from './tags.repository';

export interface TagsService {
  create(input: CreateTagInput, userId: string): Promise<Result<TagResponse, AppError>>;
  getById(id: string, userId: string): Promise<Result<TagResponse, AppError>>;
  list(userId: string): Promise<Result<TagResponse[], AppError>>;
  update(id: string, input: UpdateTagInput, userId: string): Promise<Result<TagResponse, AppError>>;
  delete(id: string, userId: string): Promise<Result<void, AppError>>;
}

export function createTagsService(repository: TagsRepository): TagsService {
  async function getTagOrFail(id: string, userId: string): Promise<Result<Tag, AppError>> {
    const tag = await repository.findById(id, userId);
    if (!tag) return err(notFoundError(`Tag with id '${id}' not found`));
    return ok(tag);
  }

  return {
    async create(input, userId) {
      const result = Tag.create(input.name, input.color ?? '#6b7280', userId);
      if (!result.ok) return result;

      await repository.create(result.value);
      return ok(result.value.toResponse());
    },

    async getById(id, userId) {
      const result = await getTagOrFail(id, userId);
      if (!result.ok) return result;
      return ok(result.value.toResponse());
    },

    async list(userId) {
      const tags = await repository.findAllByUser(userId);
      return ok(tags.map((t) => t.toResponse()));
    },

    async update(id, input, userId) {
      const result = await getTagOrFail(id, userId);
      if (!result.ok) return result;

      const updateResult = result.value.updateDetails(input.name, input.color);
      if (!updateResult.ok) return updateResult;

      await repository.update(updateResult.value);
      return ok(updateResult.value.toResponse());
    },

    async delete(id, userId) {
      const deleted = await repository.delete(id, userId);
      if (!deleted) return err(notFoundError(`Tag with id '${id}' not found`));
      return ok(undefined);
    },
  };
}
```

## Step 7: API routes

Create `apps/backend/src/modules/tags/tags.api.ts`:

```ts
import { Hono } from 'hono';
import { createTagInputSchema, updateTagInputSchema, type JwtPayload } from '@repo/shared';
import { db } from '../../infrastructure/db/client';
import { jwtGuard } from '../../middleware/jwt';
import { errorToStatus } from '../../middleware/error-handler';
import { createTagsRepository } from './tags.repository';
import { createTagsService } from './tags.service';

type Env = { Variables: { jwtPayload: JwtPayload } };

const tags = new Hono<Env>();
tags.use('*', jwtGuard);

const repository = createTagsRepository(db);
const service = createTagsService(repository);

tags.get('/', async (c) => {
  const { userId } = c.get('jwtPayload');
  const result = await service.list(userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value);
});

tags.post('/', async (c) => {
  const { userId } = c.get('jwtPayload');
  const body = await c.req.json();
  const parsed = createTagInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message }, 400);
  }
  const result = await service.create(parsed.data, userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value, 201);
});

// PATCH /:id, DELETE /:id — same pattern

export { tags as tagsApi };
```

## Step 8: Mount in app.ts

Add one line to `apps/backend/src/app.ts`:

```ts
import { tagsApi } from './modules/tags/tags.api';

// Inside createApp():
app.route('/api/tags', tagsApi);
```

## Step 9: Write tests

Create `apps/backend/src/modules/tags/tags.test.ts`. See the [testing guide](./testing.md) for details on how to structure tests with mock repositories.

## Step 10: Push schema to database

```bash
bun run db:push   # Drizzle compares schema.ts against the live database and applies changes
```

## Checklist

- [ ] Zod schemas in `packages/shared/src/schemas/`
- [ ] Schemas exported from `packages/shared/src/index.ts`
- [ ] Drizzle table in `modules/[feature]/[feature].table.ts`
- [ ] Table exported from `infrastructure/db/schema.ts`
- [ ] Domain entity with `create()`, `fromPersistence()`, `toResponse()`
- [ ] Repository interface + factory function
- [ ] Service interface + factory function (returns `Result<T, AppError>`)
- [ ] Hono sub-app with Zod validation and JWT guard
- [ ] Route mounted in `app.ts`
- [ ] Tests for domain + service layers
- [ ] Schema pushed to database (`bun run db:push`)
