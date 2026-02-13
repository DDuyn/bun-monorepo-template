# Frontend

## Stack

- **SolidJS** — reactive UI framework (fine-grained reactivity, no virtual DOM)
- **@solidjs/router** — client-side routing
- **Vite** — dev server and bundler
- **TailwindCSS v4** — utility-first CSS (via Vite plugin)
- **TypeScript** — with `jsxImportSource: "solid-js"`

## Project structure

```
apps/frontend/
├── index.html              # HTML shell with <div id="root">
├── vite.config.ts          # Vite + SolidJS + Tailwind plugins
├── tsconfig.json           # SolidJS JSX config
├── src/
│   ├── index.tsx           # Entry point: Router setup, route definitions
│   ├── index.css           # Tailwind import
│   ├── App.tsx             # Reserved for future app-level providers
│   ├── components/
│   │   └── Layout.tsx      # Shared nav + main wrapper
│   ├── pages/
│   │   ├── Home.tsx        # Items CRUD (authenticated)
│   │   └── Login.tsx       # Login/register form
│   └── lib/
│       └── api.ts          # Typed fetch client with auth headers
```

## Routing

Routes are defined in `src/index.tsx` using `@solidjs/router`:

```tsx
import { Route, Router } from '@solidjs/router';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
    </Router>
  ),
  root,
);
```

The `Layout` component is passed as the `root` prop to `Router`. This means it wraps every page and receives `RouteSectionProps` (which includes `props.children` — the matched page component):

```tsx
import type { RouteSectionProps } from '@solidjs/router';

export default function Layout(props: RouteSectionProps) {
  return (
    <div class="min-h-screen bg-gray-50">
      <nav>...</nav>
      <main>{props.children}</main>
    </div>
  );
}
```

**Why `RouteSectionProps` instead of `ParentProps`:** The SolidJS router v0.15 requires route wrapper components to use `RouteSectionProps`, which includes router-specific context beyond just `children`.

## API client

The API client (`src/lib/api.ts`) is a typed fetch wrapper organized by resource:

```ts
export const api = {
  auth: {
    login: (data: LoginInput) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: RegisterInput) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  },
  items: {
    list: (page, limit) => request<PaginatedResponse>(`/items?page=${page}&limit=${limit}`),
    get: (id) => request(`/items/${id}`),
    create: (data) => request('/items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    activate: (id) => request(`/items/${id}/activate`, { method: 'POST' }),
    deactivate: (id) => request(`/items/${id}/deactivate`, { method: 'POST' }),
    delete: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  },
};
```

The underlying `request()` function:
- Prepends `/api` to all paths
- Adds `Content-Type: application/json` header
- Attaches the JWT token from `localStorage` as `Authorization: Bearer <token>` if present
- Throws an `Error` with the server's error message on non-2xx responses
- Returns `undefined` for 204 (No Content) responses

### Token management

```ts
export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
```

The token is stored in `localStorage`. This is simple and works for personal/small projects. For production apps with higher security requirements, you'd want `httpOnly` cookies set by the server instead.

## Auth flow

1. **User visits `/`** — `Home.tsx` checks `isAuthenticated()` in `onMount`. If no token, redirects to `/login`.
2. **User logs in or registers** — `Login.tsx` calls `api.auth.login()` or `api.auth.register()`, receives a JWT, stores it with `setToken()`, and navigates to `/`.
3. **Authenticated requests** — Every `api.items.*` call automatically includes the stored token.
4. **Token expiry/invalidation** — If any API call fails (e.g., 401), the catch block calls `clearToken()` and redirects to `/login`.
5. **Logout** — Calls `clearToken()` and navigates to `/login`.

```tsx
// Home.tsx — auth guard pattern
onMount(async () => {
  if (!isAuthenticated()) {
    navigate('/login', { replace: true });
    return;
  }
  await loadItems();
});
```

## SolidJS patterns used

### Signals for state

```tsx
const [items, setItems] = createSignal<ItemResponse[]>([]);
const [loading, setLoading] = createSignal(true);
```

Unlike React's `useState`, SolidJS signals are accessed by calling them as functions: `items()`, `loading()`. The component function runs once; only the reactive expressions inside the JSX re-execute when signals change.

### `<Show>` for conditional rendering

```tsx
<Show when={!loading()} fallback={<p>Loading...</p>}>
  <Show when={items().length > 0} fallback={<p>No items yet.</p>}>
    {/* items list */}
  </Show>
</Show>
```

`<Show>` is SolidJS's equivalent of conditional rendering. It's preferred over ternary operators because it integrates with Solid's fine-grained reactivity system.

### `<For>` for lists

```tsx
<For each={items()}>
  {(item) => (
    <li>{item.name}</li>
  )}
</For>
```

`<For>` efficiently handles list rendering. Unlike React's `.map()`, it tracks individual items and only updates DOM nodes for items that actually changed.

## Vite configuration

```ts
export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### API proxy

The dev server proxies all `/api/*` requests to the backend at `localhost:3000`. This means:
- The frontend fetches `/api/items` (same origin)
- Vite forwards it to `http://localhost:3000/api/items`
- No CORS issues during development

In production, you'd configure nginx or your reverse proxy to route `/api/*` to the backend container.

### TailwindCSS v4

TailwindCSS v4 uses a Vite plugin instead of PostCSS. The only CSS file needed is:

```css
/* src/index.css */
@import "tailwindcss";
```

No `tailwind.config.js` — TailwindCSS v4 auto-detects your template files.

## Adding a new page

1. Create the page component in `src/pages/NewPage.tsx`
2. Add a `<Route>` in `src/index.tsx`:
   ```tsx
   <Route path="/new-page" component={NewPage} />
   ```
3. If the page needs authentication, add the `isAuthenticated()` guard in `onMount`
4. If it needs new API endpoints, add methods to the `api` object in `src/lib/api.ts`

## Adding API client methods

When you add a new backend module, extend the `api` object:

```ts
export const api = {
  // ...existing
  tags: {
    list: () => request<TagResponse[]>('/tags'),
    create: (data: CreateTagInput) =>
      request<TagResponse>('/tags', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/tags/${id}`, { method: 'DELETE' }),
  },
};
```

The types (`TagResponse`, `CreateTagInput`) come from `@repo/shared`, keeping the frontend in sync with the backend's expected shapes.
