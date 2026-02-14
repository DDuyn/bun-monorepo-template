import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { Item } from '../domain/item';
import type { ItemsRepository } from '../infrastructure/items.repository';
import { createUpdateItem } from '../use-cases/update-item';

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

describe('UpdateItem', () => {
  it('should update an item', async () => {
    const repo = createMockRepository();
    const item = Item.create('Original', 'desc', USER_ID);
    if (!item.ok) return;
    await repo.create(item.value);

    const updateItem = createUpdateItem(repo);
    const result = await updateItem(item.value.id, { name: 'Updated' }, USER_ID);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Updated');
    }
  });

  it('should return not found for non-existent item', async () => {
    const updateItem = createUpdateItem(createMockRepository());

    const result = await updateItem('non-existent', { name: 'Updated' }, USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
