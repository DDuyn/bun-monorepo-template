import { sign } from 'hono/jwt';
import {
  type Result,
  type AppError,
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
  ok,
  err,
  unauthorizedError,
  conflictError,
} from '@repo/shared';
import { User } from './auth.domain';
import type { AuthRepository } from './auth.repository';

export interface AuthService {
  register(input: RegisterInput): Promise<Result<AuthResponse, AppError>>;
  login(input: LoginInput): Promise<Result<AuthResponse, AppError>>;
}

export function createAuthService(
  repository: AuthRepository,
  jwtSecret: string,
): AuthService {
  async function generateToken(user: User): Promise<string> {
    return await sign({ userId: user.id, email: user.email }, jwtSecret);
  }

  return {
    async register(input) {
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

      const token = await generateToken(user);
      return ok({ token, user: user.toResponse() });
    },

    async login(input) {
      const user = await repository.findByEmail(input.email);
      if (!user) {
        return err(unauthorizedError('Invalid email or password'));
      }

      const valid = await Bun.password.verify(input.password, user.passwordHash);
      if (!valid) {
        return err(unauthorizedError('Invalid email or password'));
      }

      const token = await generateToken(user);
      return ok({ token, user: user.toResponse() });
    },
  };
}
