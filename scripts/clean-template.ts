#!/usr/bin/env bun
/**
 * Clean Template Script
 *
 * Removes the example "items" module from the template so you can start fresh
 * with only the auth system and infrastructure in place.
 *
 * Usage:
 *   bun run scripts/clean-template.ts
 *
 * What it does:
 *   1. Deletes apps/backend/src/modules/items/ (entire folder)
 *   2. Removes items route from apps/backend/src/app.ts
 *   3. Removes itemsTable export from infrastructure/db/schema.ts
 *   4. Deletes packages/shared/src/schemas/item.schema.ts
 *   5. Removes item schema exports from packages/shared/src/index.ts
 *   6. Removes api.items from apps/frontend/src/lib/api.ts
 *   7. Replaces Home.tsx with a minimal authenticated landing page
 *   8. Deletes the old local.db and migrations (you regenerate after cleanup)
 */

import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const BACKEND = resolve(ROOT, 'apps/backend');
const FRONTEND = resolve(ROOT, 'apps/frontend');
const SHARED = resolve(ROOT, 'packages/shared');

let changes = 0;

function log(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function removeDir(path: string, label: string) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true });
    log(label);
    changes++;
  }
}

function removeFile(path: string, label: string) {
  if (existsSync(path)) {
    rmSync(path);
    log(label);
    changes++;
  }
}

async function editFile(path: string, replacements: [string, string][], label: string) {
  if (!existsSync(path)) return;
  let content = await Bun.file(path).text();
  let modified = false;
  for (const [search, replace] of replacements) {
    if (content.includes(search)) {
      content = content.replace(search, replace);
      modified = true;
    }
  }
  if (modified) {
    await Bun.write(path, content);
    log(label);
    changes++;
  }
}

async function writeFile(path: string, content: string, label: string) {
  await Bun.write(path, content);
  log(label);
  changes++;
}

// ─── Start ───────────────────────────────────────────────────

console.log('\nCleaning template — removing example items module...\n');

// 1. Delete items module folder
removeDir(
  resolve(BACKEND, 'src/modules/items'),
  'Deleted apps/backend/src/modules/items/',
);

// 2. Remove items route from app.ts
await editFile(
  resolve(BACKEND, 'src/app.ts'),
  [
    ["import { itemsApi } from './modules/items/items.api';\n", ''],
    ["  app.route('/api/items', itemsApi);\n", ''],
  ],
  'Removed items route from app.ts',
);

// 3. Remove itemsTable from schema barrel
await editFile(
  resolve(BACKEND, 'src/infrastructure/db/schema.ts'),
  [
    ["export { itemsTable } from '../../modules/items/items.table';\n", ''],
  ],
  'Removed itemsTable from infrastructure/db/schema.ts',
);

// 4. Delete item schema file
removeFile(
  resolve(SHARED, 'src/schemas/item.schema.ts'),
  'Deleted packages/shared/src/schemas/item.schema.ts',
);

// 5. Remove item exports from shared index
await editFile(
  resolve(SHARED, 'src/index.ts'),
  [
    [
      `\nexport {
  itemStatusSchema,
  createItemInputSchema,
  updateItemInputSchema,
  itemResponseSchema,
  type ItemStatus,
  type CreateItemInput,
  type UpdateItemInput,
  type ItemResponse,
} from './schemas/item.schema';\n`,
      '',
    ],
  ],
  'Removed item exports from packages/shared/src/index.ts',
);

// 6. Remove api.items from frontend api client
await editFile(
  resolve(FRONTEND, 'src/lib/api.ts'),
  [
    [
      `  items: {
    list: (page = 1, limit = 20) =>
      request<{ items: unknown[]; total: number; page: number; limit: number }>(
        \`/items?page=\${page}&limit=\${limit}\`,
      ),
    get: (id: string) => request(\`/items/\${id}\`),
    create: (data: { name: string; description?: string }) =>
      request('/items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string }) =>
      request(\`/items/\${id}\`, { method: 'PATCH', body: JSON.stringify(data) }),
    activate: (id: string) =>
      request(\`/items/\${id}/activate\`, { method: 'POST' }),
    deactivate: (id: string) =>
      request(\`/items/\${id}/deactivate\`, { method: 'POST' }),
    delete: (id: string) =>
      request(\`/items/\${id}\`, { method: 'DELETE' }),
  },`,
      '',
    ],
  ],
  'Removed api.items from frontend api client',
);

// 7. Replace Home.tsx with minimal landing page
await writeFile(
  resolve(FRONTEND, 'src/pages/Home.tsx'),
  `import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { clearToken, isAuthenticated } from '../lib/api';

export default function Home() {
  const navigate = useNavigate();

  onMount(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
    }
  });

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Home</h1>
        <button
          onClick={handleLogout}
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
      <p class="text-gray-600">Welcome! Start building your app.</p>
    </>
  );
}
`,
  'Replaced Home.tsx with minimal landing page',
);

// 8. Delete old database and migrations
removeFile(
  resolve(BACKEND, 'local.db'),
  'Deleted local.db',
);
removeDir(
  resolve(BACKEND, 'src/infrastructure/db/migrations'),
  'Deleted old migrations',
);

// ─── Summary ─────────────────────────────────────────────────

if (changes > 0) {
  console.log(`\nDone! ${changes} changes applied.\n`);
  console.log('Next steps:');
  console.log('  1. bun run db:generate    # Generate fresh migrations');
  console.log('  2. bun run db:migrate     # Create tables');
  console.log('  3. bun run dev            # Start building\n');
} else {
  console.log('\nNothing to clean — items module already removed.\n');
}
