import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { Item } from '../domain/item';
import type { ItemsRepository } from '../infrastructure/items.repository';
import { createDeleteItem } from '../use-cases/delete-item';

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

const USER_ID = 'user-1';

describe('DeleteItem', () => {
  it('should delete an existing item', async () => {
    const repo = createMockRepository();
    const item = Item.create('To Delete', 'desc', USER_ID);
    if (!item.ok) return;
    await repo.create(item.value);

    const deleteItem = createDeleteItem(repo);
    const result = await deleteItem(item.value.id, USER_ID);
    expect(isOk(result)).toBe(true);

    // Verify it's gone
    const findResult = await repo.findById(item.value.id, USER_ID);
    expect(findResult).toBeNull();
  });

  it('should return not found for non-existent item', async () => {
    const deleteItem = createDeleteItem(createMockRepository());

    const result = await deleteItem('non-existent', USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
