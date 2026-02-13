import { createSignal, onMount, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { api, clearToken, isAuthenticated } from '../lib/api';
import type { ItemResponse } from '@repo/shared';

export default function Home() {
  const navigate = useNavigate();
  const [items, setItems] = createSignal<ItemResponse[]>([]);
  const [newName, setNewName] = createSignal('');
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
      return;
    }
    await loadItems();
  });

  async function loadItems() {
    setLoading(true);
    try {
      const result = await api.items.list();
      setItems(result.items as ItemResponse[]);
    } catch {
      clearToken();
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newName().trim()) return;
    await api.items.create({ name: newName() });
    setNewName('');
    await loadItems();
  }

  async function handleToggle(item: ItemResponse) {
    if (item.status === 'active') {
      await api.items.deactivate(item.id);
    } else {
      await api.items.activate(item.id);
    }
    await loadItems();
  }

  async function handleDelete(id: string) {
    await api.items.delete(id);
    await loadItems();
  }

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Items</h1>
        <button
          onClick={handleLogout}
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>

      <form onSubmit={handleCreate} class="flex gap-2 mb-6">
        <input
          type="text"
          value={newName()}
          onInput={(e) => setNewName(e.currentTarget.value)}
          placeholder="New item name..."
          class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          class="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      <Show when={!loading()} fallback={<p class="text-gray-500 text-sm">Loading...</p>}>
        <Show
          when={items().length > 0}
          fallback={<p class="text-gray-400 text-sm">No items yet. Create one above.</p>}
        >
          <ul class="space-y-2">
            <For each={items()}>
              {(item) => (
                <li class="flex items-center justify-between bg-white border border-gray-200 rounded p-3">
                  <div class="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(item)}
                      class={`w-3 h-3 rounded-full ${item.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}
                      title={item.status === 'active' ? 'Deactivate' : 'Activate'}
                    />
                    <span class="text-sm text-gray-900">{item.name}</span>
                    <span class="text-xs text-gray-400">{item.status}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    class="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </>
  );
}
