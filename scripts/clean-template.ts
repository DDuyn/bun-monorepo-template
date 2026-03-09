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
 *   6. Deletes apps/frontend/src/domain/item/ (API, service, validations)
 *   7. Replaces Home page with a minimal authenticated landing (controller + view)
 *   8. Removes Items nav entry and BoxIcon from AppLayout.tsx
 *   9. Deletes the old local.db and migrations (you regenerate after cleanup)
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
    ["export { itemsTable } from '../../modules/items/infrastructure/items.table';\n", ''],
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

// 6. Delete item domain folder (API, service, validations)
removeDir(
  resolve(FRONTEND, 'src/domain/item'),
  'Deleted apps/frontend/src/domain/item/',
);

// 7. Replace Home page with minimal authenticated landing
await writeFile(
  resolve(FRONTEND, 'src/pages/home/home.ctrl.ts'),
  `import { createStore } from 'solid-js/store';
import type { Navigator } from '@solidjs/router';
import { isAuthenticated } from '../../lib/api-client';

export function createHomeCtrl(navigate: Navigator) {
  const [state, setState] = createStore({
    loading: true,
  });

  async function init() {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
      return;
    }
    setState('loading', false);
  }

  return { state, setState, init };
}
`,
  'Replaced home.ctrl.ts with minimal controller',
);

await writeFile(
  resolve(FRONTEND, 'src/pages/home/Home.tsx'),
  `import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { createHomeCtrl } from './home.ctrl';

export default function Home() {
  const navigate = useNavigate();
  const ctrl = createHomeCtrl(navigate);

  onMount(() => ctrl.init());

  return (
    <>
      <div class="mb-8">
        <h1 class="text-2xl font-semibold text-gray-900">Home</h1>
        <p class="text-sm text-gray-500 mt-0.5">Start building your app</p>
      </div>
      <p class="text-gray-600 text-sm">Welcome! Add your features here.</p>
    </>
  );
}
`,
  'Replaced Home.tsx with minimal landing page',
);

// 8. Remove Items nav entry and BoxIcon from AppLayout.tsx
await editFile(
  resolve(FRONTEND, 'src/components/AppLayout.tsx'),
  [
    [
      `function BoxIcon(props: { class?: string }) {
  return (
    <svg class={props.class} fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

`,
      '',
    ],
    [`  { label: 'Items', href: '/items', icon: BoxIcon },\n`, ''],
  ],
  'Removed Items nav entry and BoxIcon from AppLayout.tsx',
);

// 9. Delete old database and migrations
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
  console.log('  1. bun run db:generate    # Generate migration for schema changes');
  console.log('  2. bun run db:migrate     # Apply migrations to database');
  console.log('  3. bun run dev            # Start building\n');
} else {
  console.log('\nNothing to clean — items module already removed.\n');
}
