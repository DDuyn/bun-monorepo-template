import {
  type Result,
  type AppError,
  type ItemResponse,
  type CreateItemInput,
  type UpdateItemInput,
  type PaginatedResponse,
  ok,
  err,
  notFoundError,
} from '@repo/shared';
import { Item } from './items.domain';
import type { ItemsRepository } from './items.repository';

export interface ItemsService {
  create(input: CreateItemInput, userId: string): Promise<Result<ItemResponse, AppError>>;
  getById(id: string, userId: string): Promise<Result<ItemResponse, AppError>>;
  list(userId: string, page: number, limit: number): Promise<Result<PaginatedResponse<ItemResponse>, AppError>>;
  update(id: string, input: UpdateItemInput, userId: string): Promise<Result<ItemResponse, AppError>>;
  activate(id: string, userId: string): Promise<Result<ItemResponse, AppError>>;
  deactivate(id: string, userId: string): Promise<Result<ItemResponse, AppError>>;
  delete(id: string, userId: string): Promise<Result<void, AppError>>;
}

export function createItemsService(repository: ItemsRepository): ItemsService {
  async function getItemOrFail(id: string, userId: string): Promise<Result<Item, AppError>> {
    const item = await repository.findById(id, userId);
    if (!item) {
      return err(notFoundError(`Item with id '${id}' not found`));
    }
    return ok(item);
  }

  return {
    async create(input, userId) {
      const result = Item.create(input.name, input.description ?? '', userId);
      if (!result.ok) return result;

      const item = result.value;
      await repository.create(item);
      return ok(item.toResponse());
    },

    async getById(id, userId) {
      const result = await getItemOrFail(id, userId);
      if (!result.ok) return result;
      return ok(result.value.toResponse());
    },

    async list(userId, page, limit) {
      const { items, total } = await repository.findAllByUser(userId, page, limit);
      return ok({
        items: items.map((item) => item.toResponse()),
        total,
        page,
        limit,
      });
    },

    async update(id, input, userId) {
      const result = await getItemOrFail(id, userId);
      if (!result.ok) return result;

      const updateResult = result.value.updateDetails(input.name, input.description);
      if (!updateResult.ok) return updateResult;

      const updated = updateResult.value;
      await repository.update(updated);
      return ok(updated.toResponse());
    },

    async activate(id, userId) {
      const result = await getItemOrFail(id, userId);
      if (!result.ok) return result;

      const activateResult = result.value.activate();
      if (!activateResult.ok) return activateResult;

      const activated = activateResult.value;
      await repository.update(activated);
      return ok(activated.toResponse());
    },

    async deactivate(id, userId) {
      const result = await getItemOrFail(id, userId);
      if (!result.ok) return result;

      const deactivateResult = result.value.deactivate();
      if (!deactivateResult.ok) return deactivateResult;

      const deactivated = deactivateResult.value;
      await repository.update(deactivated);
      return ok(deactivated.toResponse());
    },

    async delete(id, userId) {
      const deleted = await repository.delete(id, userId);
      if (!deleted) {
        return err(notFoundError(`Item with id '${id}' not found`));
      }
      return ok(undefined);
    },
  };
}
