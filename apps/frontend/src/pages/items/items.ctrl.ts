import { createStore } from 'solid-js/store';
import type { Navigator } from '@solidjs/router';
import { clearToken, isAuthenticated } from '../../lib/api-client';
import { listItems, createItem, toggleItem, deleteItem } from '../../domain/item/item.service';
import type { ItemResponse } from '@repo/shared';
import type { FieldErrors } from '../../domain/validation';

export function createItemsCtrl(navigate: Navigator) {
  const [state, setState] = createStore({
    items: [] as ItemResponse[],
    newName: '',
    loading: true,
    errors: {} as FieldErrors,
    generalError: '',
  });

  async function init() {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
      return;
    }
    await loadItems();
  }

  async function loadItems() {
    setState('loading', true);
    const result = await listItems();
    if (!result.ok) {
      clearToken();
      navigate('/login', { replace: true });
      return;
    }
    setState({ items: result.value.items, loading: false });
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    setState({ errors: {}, generalError: '' });

    const result = await createItem(state.newName.trim());
    if (!result.ok) {
      if ('fieldErrors' in result) {
        setState({ errors: result.fieldErrors });
      } else {
        setState({ generalError: result.error.message });
      }
      return;
    }

    setState('newName', '');
    await loadItems();
  }

  async function handleToggle(item: ItemResponse) {
    const result = await toggleItem(item);
    if (!result.ok) {
      setState({ generalError: result.error.message });
      return;
    }
    await loadItems();
  }

  async function handleDelete(id: string) {
    const result = await deleteItem(id);
    if (!result.ok) {
      setState({ generalError: result.error.message });
      return;
    }
    await loadItems();
  }

  return { state, setState, init, handleCreate, handleToggle, handleDelete };
}
