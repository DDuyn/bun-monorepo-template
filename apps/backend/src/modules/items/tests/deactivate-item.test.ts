import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { Item } from '../domain/item';
import type { ItemsRepository } from '../infrastructure/items.repository';
import { createDeactivateItem } from '../use-cases/deactivate-item';

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

describe('DeactivateItem', () => {
  it('should deactivate an active item', async () => {
    const repo = createMockRepository();
    const item = Item.create('Test', 'desc', USER_ID);
    if (!item.ok) return;
    item.value.activate();
    await repo.create(item.value);

    const deactivateItem = createDeactivateItem(repo);
    const result = await deactivateItem(item.value.id, USER_ID);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('inactive');
    }
  });

  it('should fail to deactivate an already inactive item', async () => {
    const repo = createMockRepository();
    const item = Item.create('Test', 'desc', USER_ID);
    if (!item.ok) return;
    await repo.create(item.value);

    const deactivateItem = createDeactivateItem(repo);
    const result = await deactivateItem(item.value.id, USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should return not found for non-existent item', async () => {
    const deactivateItem = createDeactivateItem(createMockRepository());

    const result = await deactivateItem('non-existent', USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
