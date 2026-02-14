# Contexto del Proyecto

Documento de referencia para que cualquier modelo de IA entienda qué es este template, cómo está estructurado y qué decisiones se tomaron. **Este archivo NO es documentación para el usuario final**, es contexto persistente para sesiones de asistencia con IA.

---

## Qué es

Un **repositorio template** en GitHub para crear proyectos fullstack TypeScript con monorepo. Cada nuevo proyecto se crea desde este template y tiene su propia infraestructura (base de datos, backend, frontend).

**Repositorio:** `https://github.com/DDuyn/bun-monorepo-template`

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Bun |
| Monorepo | Bun workspaces (`apps/*`, `packages/*`) |
| Backend | Hono |
| Frontend | SolidJS + Vite + TailwindCSS v4 |
| Base de datos | Turso (libSQL) + Drizzle ORM |
| Auth | JWT (register + login) via `hono/jwt` + `Bun.password.hash` |
| Validación | Zod |
| Manejo de errores | Result pattern (`Result<T, E>` — sin throws) |
| Testing | Bun test (TDD) |
| Linting | Biome |
| Git hooks | Lefthook (pre-push: lint + typecheck + test) |
| DI | Manual (parámetros) |
| Deploy backend | Render (free, Docker) |
| Deploy frontend | Cloudflare Pages (free) |
| Deploy base de datos | Turso (free tier) |

---

## Estructura del monorepo

```
bun-monorepo-template/
├── apps/
│   ├── backend/                  # API REST con Hono
│   │   ├── src/
│   │   │   ├── config/env.ts     # Variables de entorno validadas con Zod
│   │   │   ├── infrastructure/db/ # Cliente Drizzle, schema barrel, migraciones
│   │   │   ├── middleware/        # error-handler, jwt guard
│   │   │   ├── modules/          # Feature modules (vertical slices)
│   │   │   │   ├── auth/         # Registro + login
│   │   │   │   │   ├── domain/   # User entity
│   │   │   │   │   ├── infrastructure/ # Table + repository
│   │   │   │   │   ├── use-cases/  # register, login
│   │   │   │   │   ├── tests/    # Unit tests
│   │   │   │   │   └── auth.api.ts
│   │   │   │   ├── items/        # CRUD + state machine (example)
│   │   │   │   │   ├── domain/   # Item entity
│   │   │   │   │   ├── infrastructure/ # Table + repository
│   │   │   │   │   ├── use-cases/  # create, get, list, update, activate, deactivate, delete
│   │   │   │   │   ├── tests/    # Unit tests
│   │   │   │   │   └── items.api.ts
│   │   │   │   └── health/       # Health check
│   │   │   ├── app.ts            # Factory de Hono, middleware, montaje de rutas
│   │   │   └── index.ts          # Entry point
│   │   └── drizzle.config.ts
│   └── frontend/                 # SPA con SolidJS
│       ├── src/
│       │   ├── components/       # Layout, componentes compartidos
│       │   ├── pages/            # Home, Login
│       │   ├── lib/api.ts        # Cliente fetch tipado con gestión de token
│       │   └── index.tsx         # Entry point, rutas
│       └── public/_redirects     # SPA routing para Cloudflare Pages
├── packages/
│   └── shared/                   # Tipos, schemas Zod, Result type
│       └── src/
│           ├── result.ts         # Result<T, E>, ok(), err(), isOk(), isErr(), unwrap(), map()
│           ├── schemas/          # auth.schema, item.schema, common.schema
│           └── types/            # JwtPayload
├── docs/                         # Documentación
├── scripts/clean-template.ts     # Limpia el módulo items de ejemplo
├── .github/workflows/
│   ├── ci.yml                    # lint + typecheck + test + build
│   ├── deploy-api.yml            # db:migrate + Render deploy hook
│   └── deploy-web.yml            # build frontend + Cloudflare Pages via wrangler
├── Dockerfile.api                # Multi-stage: deps (producción) + runtime
├── render.yaml                   # Blueprint de Render
├── lefthook.yml                  # Pre-push: lint + typecheck + test (paralelo)
├── biome.json                    # Formatter + linter
├── tsconfig.base.json            # Config TS compartida
└── .env.example                  # Variables de entorno de ejemplo
```

---

## Arquitectura del backend

### Vertical Slices con Use-Cases

Cada feature vive en su propia carpeta dentro de `modules/` con subdirectorios para dominio, infraestructura, use-cases y tests:

```
modules/[feature]/
├── domain/                       # Entidades del dominio
│   └── [entity].ts
├── infrastructure/               # Tabla Drizzle + repositorio
│   ├── [feature].table.ts
│   └── [feature].repository.ts
├── use-cases/                    # Una función por operación
│   ├── create-[entity].ts
│   ├── get-[entity].ts
│   └── ...
├── tests/                        # Un archivo por entidad/use-case
│   ├── [entity].test.ts
│   ├── create-[entity].test.ts
│   └── ...
└── [feature].api.ts              # Sub-app Hono (composition root)
```

| Directorio/Archivo | Responsabilidad | Retorna |
|---------|----------------|---------|
| `domain/[entity].ts` | Entidad con comportamiento e invariantes | `Result<Entity, AppError>` |
| `infrastructure/[feature].table.ts` | Definición de tabla Drizzle | `sqliteTable(...)` |
| `infrastructure/[feature].repository.ts` | Interfaz + factory para acceso a datos | Promesas de entidades del dominio |
| `use-cases/[operation].ts` | Factory function para una operación de negocio | `Promise<Result<T, AppError>>` |
| `[feature].api.ts` | Sub-app Hono, conecta use-cases con rutas | Respuestas HTTP |
| `tests/[entity].test.ts` | Tests de la entidad del dominio | — |
| `tests/[operation].test.ts` | Tests de un use-case específico | — |

### Modelos de dominio ricos

- Constructor `private`
- `create()` — factory estática que valida y retorna `Result`
- `fromPersistence()` — reconstruye desde datos de BD (sin validar)
- `toResponse()` — convierte a la forma de respuesta de la API
- Transiciones de estado como métodos explícitos (ej: `activate()`, `deactivate()`)

### Use-case pattern

Cada operación de negocio es una función independiente creada por una factory que recibe el repositorio:

```ts
// use-cases/create-item.ts
export type CreateItem = (input: CreateItemInput, userId: string) => Promise<Result<ItemResponse, AppError>>;

export function createCreateItem(repository: ItemsRepository): CreateItem {
  return async (input, userId) => {
    const result = Item.create(input.name, input.description, userId);
    if (!result.ok) return result;
    await repository.create(result.value);
    return ok(result.value.toResponse());
  };
}

// API handler — wires use-cases
const repository = createItemsRepository(db);
const createItem = createCreateItem(repository);
const getItem = createGetItem(repository);
```

`AppError` tiene un `code` (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `CONFLICT`, `INTERNAL_ERROR`) que se mapea a HTTP status en el middleware.

### Inyección de dependencias manual

Las dependencias se pasan como parámetros de la factory function:

```ts
const repository = createItemsRepository(db);
const createItem = createCreateItem(repository);
const getItem = createGetItem(repository);
// ... un use-case por operación
```

El wiring se hace en el archivo `[feature].api.ts`, que actúa como composition root del módulo.

---

## Arquitectura del frontend

- **SolidJS** con signals (`createSignal`) y renderizado condicional (`<Show>`, `<For>`)
- **@solidjs/router** para rutas del lado del cliente
- **Cliente fetch tipado** (`lib/api.ts`) que añade automáticamente el token JWT de `localStorage`
- **Guard de auth** en `onMount`: si no hay token, redirige a `/login`
- **`VITE_API_URL`** como variable de entorno para la URL base de la API

---

## Pipeline CI/CD

```
push a main
  → Pre-push hook (lint + typecheck + test) [local, Lefthook]
    → CI (lint + typecheck + test + build) [GitHub Actions]
      → Deploy API (db:migrate contra Turso + Render Deploy Hook)
      → Deploy Web (build frontend con VITE_API_URL + Cloudflare Pages via wrangler)
```

- Los workflows de deploy usan `workflow_run` y solo se ejecutan si CI pasa en `main`
- Render tiene Auto-Deploy **desactivado** — solo despliega via Deploy Hook
- Las migraciones de BD se ejecutan **antes** del deploy del backend

---

## Secretos de GitHub necesarios por proyecto

| Secreto | Usado por |
|---------|-----------|
| `TURSO_DATABASE_URL` | Deploy API (migraciones) |
| `TURSO_AUTH_TOKEN` | Deploy API (migraciones) |
| `RENDER_DEPLOY_HOOK_URL` | Deploy API |
| `CLOUDFLARE_API_TOKEN` | Deploy Web |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy Web |
| `CLOUDFLARE_PROJECT_NAME` | Deploy Web |
| `VITE_API_URL` | Deploy Web (build del frontend) |

---

## Testing

- **TDD**: test primero, implementar después
- Se testean **dominio** y **use-cases**, no API routes ni repositorios
- **Mock repositories** con `Map` en memoria (sin mocking libraries)
- Los tests están en `tests/` dentro de cada módulo, un archivo por entidad y uno por use-case

---

## Decisiones técnicas y problemas resueltos

### `bun build` no funciona con `@libsql/client`

El bundler de Bun no puede resolver módulos nativos como `@libsql/linux-x64-gnu`. **Solución**: no hacer build, ejecutar TypeScript directamente con `bun run src/index.ts`.

### Migraciones con `db:push` vs `db:generate` + `db:migrate`

`db:push` aplica cambios directamente sin historial. **Se migró a file-based migrations** (`db:generate` + `db:migrate`) para tener un historial de cambios y poder automatizar migraciones en CD.

### Lefthook falla en Docker (no hay git)

El `postinstall` ejecuta `lefthook install`, pero en Docker no hay git. **Solución**: `"postinstall": "lefthook install || true"` para que no falle.

### Docker multi-stage para imagen más pequeña

Stage 1: instala solo dependencias de producción con `--production --ignore-scripts`. Stage 2: copia solo lo necesario (node_modules de producción + código fuente).

### Render despliega dos veces

Con Auto-Deploy activado, Render desplegaba al detectar el commit Y otra vez por el Deploy Hook de GitHub Actions. **Solución**: desactivar Auto-Deploy en Render.

### Cloudflare Pages `Project not found`

El error `[code: 8000007]` fue causado por un `CLOUDFLARE_ACCOUNT_ID` mal copiado en los secretos de GitHub. Se verificó con `bunx wrangler whoami`.

### `wrangler-action` incompatible con Bun

La action `cloudflare/wrangler-action@v3` detecta Bun e intenta usar `bunx` de forma incompatible. **Solución**: usar `bunx wrangler pages deploy` directamente en vez de la action.

---

## Script de limpieza

`scripts/clean-template.ts` elimina el módulo de ejemplo `items` cuando se bootstrappea un proyecto nuevo desde el template. Limpia archivos, imports en `app.ts`, exports en `schema.ts`, schemas en `@repo/shared`, y la migración baseline.
