import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { Item } from './items.domain';
import type { ItemsRepository } from './items.repository';
import { createItemsService } from './items.service';

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

describe('Item domain', () => {
  it('should create a valid item with inactive status', () => {
    const result = Item.create('Test Item', 'A description', USER_ID);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Test Item');
      expect(result.value.status).toBe('inactive');
      expect(result.value.isActive).toBe(false);
    }
  });

  it('should reject empty name', () => {
    const result = Item.create('', 'desc', USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should reject name exceeding 200 characters', () => {
    const result = Item.create('a'.repeat(201), 'desc', USER_ID);
    expect(isErr(result)).toBe(true);
  });

  it('should activate an inactive item', () => {
    const createResult = Item.create('Test', 'desc', USER_ID);
    expect(isOk(createResult)).toBe(true);
    if (!createResult.ok) return;

    const activateResult = createResult.value.activate();
    expect(isOk(activateResult)).toBe(true);
    if (activateResult.ok) {
      expect(activateResult.value.isActive).toBe(true);
    }
  });

  it('should fail to activate an already active item', () => {
    const createResult = Item.create('Test', 'desc', USER_ID);
    if (!createResult.ok) return;

    createResult.value.activate();
    const secondActivate = createResult.value.activate();
    expect(isErr(secondActivate)).toBe(true);
    if (!secondActivate.ok) {
      expect(secondActivate.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should deactivate an active item', () => {
    const createResult = Item.create('Test', 'desc', USER_ID);
    if (!createResult.ok) return;

    createResult.value.activate();
    const deactivateResult = createResult.value.deactivate();
    expect(isOk(deactivateResult)).toBe(true);
    if (deactivateResult.ok) {
      expect(deactivateResult.value.isActive).toBe(false);
    }
  });

  it('should fail to deactivate an already inactive item', () => {
    const createResult = Item.create('Test', 'desc', USER_ID);
    if (!createResult.ok) return;

    const deactivateResult = createResult.value.deactivate();
    expect(isErr(deactivateResult)).toBe(true);
  });

  it('should update name and description', () => {
    const createResult = Item.create('Original', 'Original desc', USER_ID);
    if (!createResult.ok) return;

    const updateResult = createResult.value.updateDetails('Updated', 'New desc');
    expect(isOk(updateResult)).toBe(true);
    if (updateResult.ok) {
      expect(updateResult.value.name).toBe('Updated');
      expect(updateResult.value.description).toBe('New desc');
    }
  });

  it('should produce a valid response', () => {
    const createResult = Item.create('Test', 'desc', USER_ID);
    if (!createResult.ok) return;

    const response = createResult.value.toResponse();
    expect(response.name).toBe('Test');
    expect(response.status).toBe('inactive');
    expect(response.createdAt).toBeDefined();
    expect(response.updatedAt).toBeDefined();
  });
});

describe('ItemsService', () => {
  it('should create and retrieve an item', async () => {
    const service = createItemsService(createMockRepository());

    const createResult = await service.create({ name: 'My Item', description: 'desc' }, USER_ID);
    expect(isOk(createResult)).toBe(true);
    if (!createResult.ok) return;

    const getResult = await service.getById(createResult.value.id, USER_ID);
    expect(isOk(getResult)).toBe(true);
    if (getResult.ok) {
      expect(getResult.value.name).toBe('My Item');
    }
  });

  it('should return not found for non-existent item', async () => {
    const service = createItemsService(createMockRepository());

    const result = await service.getById('non-existent', USER_ID);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should list items with pagination', async () => {
    const service = createItemsService(createMockRepository());

    await service.create({ name: 'Item 1', description: '' }, USER_ID);
    await service.create({ name: 'Item 2', description: '' }, USER_ID);
    await service.create({ name: 'Item 3', description: '' }, USER_ID);

    const result = await service.list(USER_ID, 1, 2);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(2);
      expect(result.value.total).toBe(3);
    }
  });

  it('should activate an item', async () => {
    const service = createItemsService(createMockRepository());

    const createResult = await service.create({ name: 'Item', description: '' }, USER_ID);
    if (!createResult.ok) return;

    const activateResult = await service.activate(createResult.value.id, USER_ID);
    expect(isOk(activateResult)).toBe(true);
    if (activateResult.ok) {
      expect(activateResult.value.status).toBe('active');
    }
  });

  it('should update an item', async () => {
    const service = createItemsService(createMockRepository());

    const createResult = await service.create({ name: 'Original', description: '' }, USER_ID);
    if (!createResult.ok) return;

    const updateResult = await service.update(
      createResult.value.id,
      { name: 'Updated' },
      USER_ID,
    );
    expect(isOk(updateResult)).toBe(true);
    if (updateResult.ok) {
      expect(updateResult.value.name).toBe('Updated');
    }
  });

  it('should delete an item', async () => {
    const service = createItemsService(createMockRepository());

    const createResult = await service.create({ name: 'To Delete', description: '' }, USER_ID);
    if (!createResult.ok) return;

    const deleteResult = await service.delete(createResult.value.id, USER_ID);
    expect(isOk(deleteResult)).toBe(true);

    const getResult = await service.getById(createResult.value.id, USER_ID);
    expect(isErr(getResult)).toBe(true);
  });

  it('should not access items from another user', async () => {
    const service = createItemsService(createMockRepository());

    const createResult = await service.create({ name: 'Private', description: '' }, USER_ID);
    if (!createResult.ok) return;

    const result = await service.getById(createResult.value.id, 'other-user');
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
