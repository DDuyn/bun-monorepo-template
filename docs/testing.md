# Testing

## Strategy

We test **domain entities** and **services**. We don't test API routes directly (those are thin wrappers over services), and we don't test repositories (those are thin wrappers over Drizzle). The goal is to test business logic and invariants, not framework plumbing.

```
What we test:
  ✓ Domain entities — invariants, state transitions, validation
  ✓ Services — business logic, error handling, orchestration

What we skip:
  ✗ API routes — just Zod parsing + service call + response mapping
  ✗ Repositories — just Drizzle queries, tested implicitly through integration
  ✗ Middleware — tested through real requests in development
```

## Running tests

```bash
bun run test          # All workspaces
bun run test:api      # Backend only
bun test --watch      # Watch mode (from apps/backend/)
```

Bun's test runner discovers files matching `*.test.ts` automatically.

## TDD workflow

1. Write a failing test for the behavior you want
2. Implement the minimum code to make it pass
3. Refactor if needed, keeping tests green
4. Repeat

Since services receive repositories as parameters (manual DI), you can write and test business logic before the database or API layer even exists.

## Mock repositories

The key testing technique is **mock repositories**. Instead of hitting a real database, we create in-memory implementations of the repository interface using a `Map`:

```ts
// From items.test.ts
function createMockRepository(): ItemsRepository {
  const store = new Map<string, Item>();

  return {
    async findById(id, userId) {
      const item = store.get(id);
      if (!item || item.userId !== userId) return null;
      return item;
    },
    async findAllByUser(userId, page, limit) {
      const all = [...store.values()].filter((i) => i.userId === userId);
      const offset = (page - 1) * limit;
      return { items: all.slice(offset, offset + limit), total: all.length };
    },
    async create(item) {
      store.set(item.id, item);
    },
    async update(item) {
      store.set(item.id, item);
    },
    async delete(id, userId) {
      const item = store.get(id);
      if (!item || item.userId !== userId) return false;
      store.delete(id);
      return true;
    },
  };
}
```

**Why this works:** The service depends on the `ItemsRepository` interface, not on the Drizzle implementation. The mock fulfills the same contract. Tests run instantly with no database setup.

**Why this is better than mocking libraries:** The mock is explicit, readable, and behaves like a real data store (including things like "delete returns false if not found"). You can see all the behavior in one place instead of configuring stubs.

## Testing domain entities

Domain tests verify that:
- Valid inputs produce valid entities
- Invalid inputs produce the correct error
- State transitions enforce rules
- `toResponse()` produces the expected shape

Example from `items.test.ts`:

```ts
describe('Item domain', () => {
  it('should create a valid item with inactive status', () => {
    const result = Item.create('Test Item', 'A description', USER_ID);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Test Item');
      expect(result.value.status).toBe('inactive');
      expect(result.value.isActive).toBe(false);
    }
  });

  it('should reject empty name', () => {
    const result = Item.create('', 'desc', USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should fail to activate an already active item', () => {
    const createResult = Item.create('Test', 'desc', USER_ID);
    if (!createResult.ok) return;

    createResult.value.activate();
    const secondActivate = createResult.value.activate();
    expect(isErr(secondActivate)).toBe(true);
  });
});
```

**Pattern:** Call the factory/method, then assert on the `Result`. Use `isOk()`/`isErr()` to check success/failure, then narrow with `if (result.ok)` before accessing `.value` or `.error`.

## Testing services

Service tests verify:
- Happy paths (create, read, update, delete)
- Error paths (not found, duplicate, invalid input)
- Business rules (user isolation, state transitions through the service)
- Pagination behavior

Example from `items.test.ts`:

```ts
describe('ItemsService', () => {
  it('should create and retrieve an item', async () => {
    const service = createItemsService(createMockRepository());

    const createResult = await service.create({ name: 'My Item', description: 'desc' }, USER_ID);
    expect(isOk(createResult)).toBe(true);
    if (!createResult.ok) return;

    const getResult = await service.getById(createResult.value.id, USER_ID);
    expect(isOk(getResult)).toBe(true);
    if (getResult.ok) {
      expect(getResult.value.name).toBe('My Item');
    }
  });

  it('should not access items from another user', async () => {
    const service = createItemsService(createMockRepository());

    const createResult = await service.create({ name: 'Private', description: '' }, USER_ID);
    if (!createResult.ok) return;

    const result = await service.getById(createResult.value.id, 'other-user');
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
```

**Pattern:** Create a fresh service with a fresh mock repository for each test (or use `beforeEach`). This ensures tests are isolated — no shared state between them.

## Testing auth

The auth service tests use a slightly different mock because the repository interface is different (keyed by email):

```ts
function createMockRepository(users: User[] = []): AuthRepository {
  const store = new Map<string, User>();
  for (const u of users) store.set(u.email, u);

  return {
    async findByEmail(email) { return store.get(email) ?? null; },
    async findById(id) { /* iterate store.values() */ },
    async create(user) { store.set(user.email, user); },
  };
}
```

You can also pre-populate the mock with existing users to test scenarios like "email already exists":

```ts
it('should fail if email already exists', async () => {
  const existingUser = User.fromPersistence({ /* ... */ });
  const repo = createMockRepository([existingUser]);
  const service = createAuthService(repo, JWT_SECRET);

  const result = await service.register({ email: 'test@example.com', /* ... */ });
  expect(isErr(result)).toBe(true);
  if (!result.ok) {
    expect(result.error.code).toBe('CONFLICT');
  }
});
```

## File naming

Test files live next to the code they test:

```
modules/items/
├── items.domain.ts
├── items.service.ts
├── items.test.ts      ← tests for both domain and service
```

You could split into `items.domain.test.ts` and `items.service.test.ts` if a module grows large enough to warrant it.

## What makes a good test

1. **One behavior per test.** "should reject empty name" is one test, not combined with "should reject long name".
2. **Descriptive names.** The test name should read as a specification: "should not access items from another user".
3. **Arrange-Act-Assert.** Set up the state, call the method, check the result. No complex setup shared across tests.
4. **Test the Result, not the internals.** Assert on `result.error.code`, not on whether a specific internal method was called.
5. **No mocking libraries.** Write plain objects that satisfy the interface. This is simpler, more readable, and forces you to think about the contract.
