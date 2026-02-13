import { Hono } from 'hono';
import {
  createItemInputSchema,
  updateItemInputSchema,
  paginationSchema,
  type JwtPayload,
} from '@repo/shared';
import { db } from '../../infrastructure/db/client';
import { jwtGuard } from '../../middleware/jwt';
import { errorToStatus } from '../../middleware/error-handler';
import { createItemsRepository } from './items.repository';
import { createItemsService } from './items.service';

type Env = { Variables: { jwtPayload: JwtPayload } };

const items = new Hono<Env>();
items.use('*', jwtGuard);

const repository = createItemsRepository(db);
const service = createItemsService(repository);

// GET /api/items
items.get('/', async (c) => {
  const { userId } = c.get('jwtPayload');
  const query = c.req.query();
  const parsed = paginationSchema.safeParse(query);
  const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 20 };

  const result = await service.list(userId, page, limit);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value);
});

// GET /api/items/:id
items.get('/:id', async (c) => {
  const { userId } = c.get('jwtPayload');
  const { id } = c.req.param();

  const result = await service.getById(id, userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value);
});

// POST /api/items
items.post('/', async (c) => {
  const { userId } = c.get('jwtPayload');
  const body = await c.req.json();
  const parsed = createItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message }, 400);
  }

  const result = await service.create(parsed.data, userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value, 201);
});

// PATCH /api/items/:id
items.patch('/:id', async (c) => {
  const { userId } = c.get('jwtPayload');
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message }, 400);
  }

  const result = await service.update(id, parsed.data, userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value);
});

// POST /api/items/:id/activate
items.post('/:id/activate', async (c) => {
  const { userId } = c.get('jwtPayload');
  const { id } = c.req.param();

  const result = await service.activate(id, userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value);
});

// POST /api/items/:id/deactivate
items.post('/:id/deactivate', async (c) => {
  const { userId } = c.get('jwtPayload');
  const { id } = c.req.param();

  const result = await service.deactivate(id, userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.json(result.value);
});

// DELETE /api/items/:id
items.delete('/:id', async (c) => {
  const { userId } = c.get('jwtPayload');
  const { id } = c.req.param();

  const result = await service.delete(id, userId);
  if (!result.ok) return c.json(result.error, errorToStatus(result.error.code));
  return c.body(null, 204);
});

export { items as itemsApi };
