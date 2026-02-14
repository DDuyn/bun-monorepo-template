import { describe, it, expect } from 'bun:test';
import { isOk } from '@repo/shared';
import { Item } from '../domain/item';
import type { ItemsRepository } from '../infrastructure/items.repository';
import { createListItems } from '../use-cases/list-items';

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

describe('ListItems', () => {
  it('should list items with pagination', async () => {
    const repo = createMockRepository();
    const item1 = Item.create('Item 1', '', USER_ID);
    const item2 = Item.create('Item 2', '', USER_ID);
    const item3 = Item.create('Item 3', '', USER_ID);
    if (!item1.ok || !item2.ok || !item3.ok) return;
    await repo.create(item1.value);
    await repo.create(item2.value);
    await repo.create(item3.value);

    const listItems = createListItems(repo);
    const result = await listItems(USER_ID, 1, 2);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(2);
      expect(result.value.total).toBe(3);
    }
  });

  it('should return empty list for user with no items', async () => {
    const listItems = createListItems(createMockRepository());

    const result = await listItems(USER_ID, 1, 20);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(0);
      expect(result.value.total).toBe(0);
    }
  });
});
