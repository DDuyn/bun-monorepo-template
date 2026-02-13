# bun-monorepo-template

Fullstack TypeScript monorepo template with **Bun**, **Hono**, **SolidJS**, and **Drizzle ORM**.

## Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Runtime     | Bun                                 |
| Monorepo    | Bun workspaces                      |
| Backend     | Hono                                |
| Frontend    | SolidJS + Vite                      |
| Database    | Turso (libSQL) + Drizzle ORM        |
| Auth        | JWT (register + login)              |
| Validation  | Zod                                 |
| Styling     | TailwindCSS v4                      |
| Testing     | Bun test                            |
| Linting     | Biome                               |
| Deploy API  | Render (Docker, free tier)          |
| Deploy Web  | Cloudflare Pages (free, unlimited)  |

## Structure

```
├── apps/
│   ├── backend/          # Hono REST API
│   └── frontend/         # SolidJS SPA
├── packages/
│   └── shared/           # Shared types, schemas, Result type
├── docs/                 # Documentation
└── scripts/              # Template utilities
```

## Getting started

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Push schema to database (creates local.db)
bun run db:push

# Start development (backend + frontend)
bun run dev
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173` (with API proxy to backend).

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `bun run dev`      | Start all apps in dev mode           |
| `bun run dev:api`  | Start backend only                   |
| `bun run dev:web`  | Start frontend only                  |
| `bun run test`     | Run all tests                        |
| `bun run test:api` | Run backend tests only               |
| `bun run lint`     | Lint with Biome                      |
| `bun run lint:fix` | Lint and auto-fix                    |
| `bun run build`    | Build all apps                       |
| `bun run db:push`  | Push Drizzle schema to database      |
| `bun run clean`    | Remove example items module          |

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

## Deployment

The template includes CI/CD workflows for deploying to free-tier services:

- **API**: Render (Docker) — auto-deploys after CI passes via deploy hook
- **Frontend**: Cloudflare Pages — built and deployed via GitHub Actions
- **Database**: Turso — managed libSQL, push schema manually before deploy

See [docs/deployment.md](docs/deployment.md) for full setup instructions.

## Docker

```bash
# Build backend
docker build -f Dockerfile.api -t app-api .

# Build frontend
docker build -f Dockerfile.web -t app-web .
```

## Starting fresh

Run `bun run clean` to remove the example items module. This leaves you with the auth system, infrastructure, and patterns ready for your own features. See [docs/adding-a-feature.md](docs/adding-a-feature.md) for a step-by-step guide.

## Documentation

- [Architecture](docs/architecture.md) — Project structure and design decisions
- [Backend](docs/backend.md) — API layer, middleware, error handling
- [Database](docs/database.md) — Turso, Drizzle ORM, schema push
- [Frontend](docs/frontend.md) — SolidJS, routing, API client
- [Testing](docs/testing.md) — TDD approach, test patterns
- [Result Pattern](docs/result-pattern.md) — Error handling without exceptions
- [Adding a Feature](docs/adding-a-feature.md) — Step-by-step guide
- [Deployment](docs/deployment.md) — Turso, Render, Cloudflare Pages setup
