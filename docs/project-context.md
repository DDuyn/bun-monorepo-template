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
│       │   ├── domain/           # Capa de dominio (validaciones + API + servicio por feature)
│       │   │   ├── validation.ts            # FieldErrors, ValidationResult, zodIssuesToFieldErrors
│       │   │   ├── auth/
│       │   │   │   ├── auth.validations.ts  # Validaciones con Zod → ValidationResult<T>
│       │   │   │   ├── auth.api.ts          # Endpoints de auth
│       │   │   │   └── auth.service.ts      # Orquesta validación + API → AuthServiceResult<T>
│       │   │   └── item/
│       │   │       ├── item.validations.ts  # Validaciones con Zod → ValidationResult<T>
│       │   │       ├── item.api.ts          # Endpoints de items
│       │   │       └── item.service.ts      # Orquesta validación + API → ItemServiceResult<T>
│       │   ├── pages/            # Capa de vista + controlador por página
│       │   │   ├── login/
│       │   │   │   ├── Login.tsx            # Vista pura (solo JSX)
│       │   │   │   └── login.ctrl.ts        # Controlador (signals + handlers)
│       │   │   └── home/
│       │   │       ├── Home.tsx             # Vista pura (solo JSX)
│       │   │       └── home.ctrl.ts         # Controlador (signals + handlers)
│       │   ├── components/       # Layout, componentes compartidos
│       │   │   ├── Layout.tsx
│       │   │   └── ui/           # Componentes reutilizables (Input, Button, ...)
│       │   │       ├── Input.tsx
│       │   │       └── Button.tsx
│       │   ├── lib/api-client.ts # Transporte HTTP genérico + token utils
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

### 3 capas: Vista – Controlador – Dominio (Service)

Inspirado en la filosofía de SpoonKit: la vista es agnóstica a la lógica, el controlador conecta vista con dominio, y el dominio contiene validaciones, llamadas a API y reglas de negocio.

```
Vista (.tsx) --> Controlador (.ctrl.ts) --> Service (.service.ts) --> Validations + API
                                                                        └── api-client.ts
```

El controlador NO conoce ni las validaciones ni la API directamente. Solo habla con el servicio del dominio.

#### Capa 1: Dominio (`domain/[feature]/`)

Cada feature tiene su carpeta con tres archivos, más un archivo compartido `domain/validation.ts`:

- **`domain/validation.ts`** — Tipos frontend-only para errores por campo. `AppError` de `@repo/shared` permanece sin cambios.
  - `FieldErrors = Record<string, string>` — Mapa campo → mensaje de error
  - `ValidationResult<T>` — `{ ok: true; value: T } | { ok: false; fieldErrors: FieldErrors }`
  - `zodIssuesToFieldErrors(issues)` — Mapea `ZodIssue[]` a `FieldErrors` usando `issue.path[0]` como clave
- **`[feature].validations.ts`** — Funciones de validación puras que usan los schemas Zod de `@repo/shared` y retornan `ValidationResult<T>`. No dependen de SolidJS ni de la API.
- **`[feature].api.ts`** — Definición de endpoints HTTP del feature. Usa `request<T>()` de `lib/api-client.ts`.
- **`[feature].service.ts`** — Orquesta validación + llamada API. Retorna un `ServiceResult<T>` que es una unión de tres casos:
  - `{ ok: true; value: T }` — Éxito
  - `{ ok: false; fieldErrors: FieldErrors }` — Validación fallida (errores por campo)
  - `{ ok: false; error: AppError }` — Error de API o red

```ts
// domain/auth/auth.service.ts
export type AuthServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: FieldErrors }
  | { ok: false; error: AppError };

export async function login(email: string, password: string): Promise<AuthServiceResult<AuthResponse>> {
  const validation = validateLoginInput(email, password);
  if (!validation.ok) return validation; // { ok: false, fieldErrors: { email: "...", ... } }
  try {
    const response = await authApi.login(validation.value);
    return ok(response);
  } catch (error) {
    return { ok: false, error: internalError(error.message) };
  }
}
```

#### Capa 2: Controlador (`pages/[feature]/[feature].ctrl.ts`)

Factory function que retorna un objeto con un store (estado reactivo) y handlers. Conoce SolidJS (usa `createStore`) pero NO genera JSX. Solo importa del servicio del dominio.

El store distingue entre errores por campo (`errors`) y errores generales de API (`generalError`):

```ts
// pages/login/login.ctrl.ts
export function createLoginCtrl(navigate: Navigator) {
  const [state, setState] = createStore({
    email: '', password: '', name: '',
    isRegister: false,
    errors: {} as FieldErrors,   // { email: "Invalid email", password: "Too short" }
    generalError: '',             // "Network error" / "Unauthorized"
    loading: false,
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setState({ errors: {}, generalError: '', loading: true });
    const result = state.isRegister
      ? await register(state.email, state.password, state.name)
      : await login(state.email, state.password);
    if (!result.ok) {
      if ('fieldErrors' in result) setState({ errors: result.fieldErrors, loading: false });
      else setState({ generalError: result.error.message, loading: false });
      return;
    }
    setToken(result.value.token);
    navigate('/');
  }

  return { state, setState, handleSubmit, toggleMode };
}
```

#### Capa 3: Vista (`pages/[feature]/[Feature].tsx`)

Solo JSX. Recibe del controlador datos reactivos y handlers. Sin lógica de negocio ni validaciones. Accede al estado como propiedades del objeto (`ctrl.state.email`, sin paréntesis):

```tsx
// pages/login/Login.tsx
export default function Login() {
  const navigate = useNavigate();
  const ctrl = createLoginCtrl(navigate);

  return (
    <form onSubmit={ctrl.handleSubmit}>
      <input value={ctrl.state.email} onInput={(e) => ctrl.setState('email', e.currentTarget.value)} />
      {/* ... solo renderizado */}
    </form>
  );
}
```

#### Estado reactivo: `createStore` por defecto

Se usa `createStore` de `solid-js/store` en lugar de múltiples `createSignal`. Ventajas:

- **Menos verboso**: un solo store en vez de N pairs `[value, setValue]`
- **Acceso directo**: `state.email` en vez de `email()` — más natural para devs de backend
- **Actualizaciones en bloque**: `setState({ error: '', loading: true })` en una sola llamada
- **Reactividad granular en arrays**: si se actualiza un item individual, SolidJS solo re-renderiza ese elemento, no toda la lista

Para componentes con 1-2 valores simples (ej: un toggle de modal), `createSignal` sigue siendo válido.

#### Componentes reutilizables: `components/ui/`

Componentes de UI reutilizables para evitar repetir estilos de Tailwind en cada vista:

- **`Input`** — Input con label opcional, estilo soft (fondo gris claro, borde sutil, bordes redondeados). Props: `label?`, `value`, `onInput`, `type?`, `placeholder?`, `error?`, `class?`
  - Si se pasa `error`, el campo se muestra en rojo y hay un texto de error inline debajo del campo
- **`Button`** — Botón con variantes (`primary`, `danger`, `ghost`). Usa colores del tema (`bg-primary`, `text-danger`). Props: `children`, `onClick?`, `type?`, `variant?`, `disabled?`, `class?`

```tsx
// Ejemplo de uso con errores inline
<Input label="Email" type="email" value={ctrl.state.email}
  onInput={(v) => ctrl.setState('email', v)}
  error={ctrl.state.errors.email} />
<Button type="submit" disabled={ctrl.state.loading}>Sign in</Button>
<Button variant="danger" onClick={handleDelete}>Delete</Button>
```

**Patrón**: cuando un patrón de UI se repite 3+ veces en las vistas, se extrae a `components/ui/`. Los componentes son wrappers ligeros sobre HTML + Tailwind, no abstracciones complejas. Siempre aceptan `class` para extensión puntual.

#### Tema visual y CSS

- **Tailwind v4** con directiva `@theme` en `index.css` para definir custom properties
- **Work Sans** como fuente principal (cargada desde Google Fonts en `index.html`)
- Colores del tema disponibles como clases de Tailwind:
  - `bg-primary` / `hover:bg-primary-hover` / `bg-primary-light` — Indigo (#4f46e5)
  - `text-danger` / `hover:text-danger-hover` / `bg-danger-light` — Rojo (#ef4444)

```css
/* index.css */
@import "tailwindcss";

@theme {
  --font-sans: "Work Sans", ui-sans-serif, system-ui, sans-serif;
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-primary-light: #e0e7ff;
  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-danger-light: #fef2f2;
}
```

#### Infraestructura: `lib/api-client.ts`

Cliente HTTP genérico reutilizable por todos los dominios:

- `request<T>(path, options)` — Fetch genérico con JSON, Bearer token automático, manejo de errores
- `setToken(token)` / `clearToken()` / `isAuthenticated()` — Gestión de JWT en `localStorage`
- **`VITE_API_URL`** como variable de entorno para la URL base de la API

### Patrón para añadir una nueva feature

1. Crear `domain/[feature]/[feature].validations.ts` con funciones que retornen `ValidationResult<T>`
2. Crear `domain/[feature]/[feature].api.ts` con los endpoints
3. Crear `domain/[feature]/[feature].service.ts` que orquesta validación + API, retornando `ServiceResult<T>`
4. Crear `pages/[feature]/[feature].ctrl.ts` con el controlador (factory function + createStore con `errors: FieldErrors` y `generalError: string`)
5. Crear `pages/[feature]/[Feature].tsx` con la vista pura — pasar `error={ctrl.state.errors.field}` a cada `<Input>`, mostrar `generalError` en un banner
6. Añadir la ruta en `index.tsx`

### Otras características

- **SolidJS** con `createStore` para estado y renderizado condicional (`<Show>`, `<For>`)
- **@solidjs/router** para rutas del lado del cliente
- **Guard de auth** en `onMount` del controlador: si no hay token, redirige a `/login`
- **Validación client-side con Zod** usando los mismos schemas de `@repo/shared` (validación antes de llamar a la API, encapsulada en el servicio)

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
