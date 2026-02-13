import { Hono } from 'hono';
import { loginInputSchema, registerInputSchema } from '@repo/shared';
import { db } from '../../infrastructure/db/client';
import { env } from '../../config/env';
import { errorToStatus } from '../../middleware/error-handler';
import { createAuthRepository } from './auth.repository';
import { createAuthService } from './auth.service';

const auth = new Hono();

const repository = createAuthRepository(db);
const service = createAuthService(repository, env.JWT_SECRET);

auth.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      400,
    );
  }

  const result = await service.register(parsed.data);
  if (!result.ok) {
    return c.json(result.error, errorToStatus(result.error.code));
  }
  return c.json(result.value, 201);
});

auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      400,
    );
  }

  const result = await service.login(parsed.data);
  if (!result.ok) {
    return c.json(result.error, errorToStatus(result.error.code));
  }
  return c.json(result.value);
});

export { auth as authApi };
