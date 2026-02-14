import { sign } from 'hono/jwt';
import {
  type Result,
  type AppError,
  type AuthResponse,
  type LoginInput,
  ok,
  err,
  unauthorizedError,
} from '@repo/shared';
import type { AuthRepository } from '../infrastructure/auth.repository';

export type Login = (input: LoginInput) => Promise<Result<AuthResponse, AppError>>;

export function createLogin(repository: AuthRepository, jwtSecret: string): Login {
  return async (input) => {
    const user = await repository.findByEmail(input.email);
    if (!user) {
      return err(unauthorizedError('Invalid email or password'));
    }

    const valid = await Bun.password.verify(input.password, user.passwordHash);
    if (!valid) {
      return err(unauthorizedError('Invalid email or password'));
    }

    const token = await sign({ userId: user.id, email: user.email }, jwtSecret);
    return ok({ token, user: user.toResponse() });
  };
}
