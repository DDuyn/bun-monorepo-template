# bun-monorepo-template

Fullstack TypeScript monorepo template with **Bun**, **Hono**, **SolidJS**, and **Drizzle ORM**.

## Stack

| Layer       | Technology                |
| ----------- | ------------------------- |
| Runtime     | Bun                       |
| Monorepo    | Bun workspaces            |
| Backend     | Hono                      |
| Frontend    | SolidJS + Vite            |
| Database    | SQLite + Drizzle ORM      |
| Auth        | JWT (register + login)    |
| Validation  | Zod                       |
| Styling     | TailwindCSS v4            |
| Testing     | Bun test                  |
| Linting     | Biome                     |

## Structure

```
├── apps/
│   ├── backend/          # Hono REST API
│   └── frontend/         # SolidJS SPA
├── packages/
│   └── shared/           # Shared types, schemas, Result type
```

## Getting started

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Generate database migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Start development (backend + frontend)
bun run dev
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173` (with API proxy to backend).

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `bun run dev`    | Start all apps in dev mode           |
| `bun run dev:api`| Start backend only                   |
| `bun run dev:web`| Start frontend only                  |
| `bun run test`   | Run all tests                        |
| `bun run test:api`| Run backend tests only              |
| `bun run lint`   | Lint with Biome                      |
| `bun run lint:fix`| Lint and auto-fix                   |
| `bun run build`  | Build all apps                       |
| `bun run db:generate` | Generate Drizzle migrations     |
| `bun run db:migrate`  | Run Drizzle migrations          |

## Backend architecture

The backend follows a **vertical slice / feature modules** pattern with **DDD Lite** and **rich domain models**.

```
modules/
└── [feature]/
    ├── [feature].api.ts          # Hono sub-app (routes)
    ├── [feature].service.ts      # Business logic, returns Result<T, E>
    ├── [feature].repository.ts   # Data access (Drizzle)
    ├── [feature].domain.ts       # Entities with behavior (rich domain)
    ├── [feature].table.ts        # Drizzle table definition
    └── [feature].test.ts         # Unit tests (TDD)
```

### Key patterns

- **Result pattern**: Services return `Result<T, AppError>` instead of throwing. See `packages/shared/src/result.ts`.
- **Rich domain**: Entities have behavior and enforce invariants. No anemic models.
- **Manual DI**: Services receive dependencies as constructor parameters. Easy to test with mocks.
- **Zod validation**: Input validated at the API layer with shared schemas from `@repo/shared`.

### API endpoints

**Auth** (public):
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in

**Items** (JWT protected):
- `GET /api/items` - List items (paginated)
- `GET /api/items/:id` - Get item
- `POST /api/items` - Create item
- `PATCH /api/items/:id` - Update item
- `POST /api/items/:id/activate` - Activate item
- `POST /api/items/:id/deactivate` - Deactivate item
- `DELETE /api/items/:id` - Delete item

**Health**:
- `GET /api/health` - Health check

## Docker

```bash
# Build backend
docker build -f Dockerfile.api -t app-api .

# Build frontend
docker build -f Dockerfile.web -t app-web .
```

## Adding a new feature module

1. Create a folder in `apps/backend/src/modules/[feature]/`
2. Define the Drizzle table in `[feature].table.ts`
3. Export it from `infrastructure/db/schema.ts`
4. Create domain entities in `[feature].domain.ts`
5. Create the repository in `[feature].repository.ts`
6. Create the service with business logic in `[feature].service.ts`
7. Create the Hono sub-app in `[feature].api.ts`
8. Register the route in `app.ts`
9. Add shared Zod schemas in `packages/shared/src/schemas/`
10. Write tests in `[feature].test.ts`
