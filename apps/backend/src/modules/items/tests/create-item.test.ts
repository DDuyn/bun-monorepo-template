import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { Item } from '../domain/item';
import type { ItemsRepository } from '../infrastructure/items.repository';
import { createCreateItem } from '../use-cases/create-item';

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

describe('CreateItem', () => {
  it('should create an item successfully', async () => {
    const createItem = createCreateItem(createMockRepository());

    const result = await createItem({ name: 'My Item', description: 'desc' }, USER_ID);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('My Item');
      expect(result.value.status).toBe('inactive');
    }
  });

  it('should fail with empty name', async () => {
    const createItem = createCreateItem(createMockRepository());

    const result = await createItem({ name: '', description: 'desc' }, USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
