import { sign } from 'hono/jwt';
import {
  type Result,
  type AppError,
  type AuthResponse,
  type RegisterInput,
  ok,
  err,
  conflictError,
} from '@repo/shared';
import { User } from '../domain/user';
import type { AuthRepository } from '../infrastructure/auth.repository';

export type Register = (input: RegisterInput) => Promise<Result<AuthResponse, AppError>>;

export function createRegister(repository: AuthRepository, jwtSecret: string): Register {
  return async (input) => {
    const existing = await repository.findByEmail(input.email);
    if (existing) {
      return err(conflictError('A user with this email already exists'));
    }

    const passwordHash = await Bun.password.hash(input.password);
    const id = crypto.randomUUID();

    const result = User.create({
      id,
      email: input.email,
      name: input.name,
      passwordHash,
      createdAt: new Date(),
    });

    if (!result.ok) return result;

    const user = result.value;
    await repository.create(user);

    const token = await sign({ userId: user.id, email: user.email }, jwtSecret);
    return ok({ token, user: user.toResponse() });
  };
}
