import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { User } from '../domain/user';
import type { AuthRepository } from '../infrastructure/auth.repository';
import { createRegister } from '../use-cases/register';
import { createLogin } from '../use-cases/login';

function createMockRepository(users: User[] = []): AuthRepository {
  const store = new Map<string, User>();
  for (const u of users) store.set(u.email, u);

  return {
    async findByEmail(email) {
      return store.get(email) ?? null;
    },
    async findById(id) {
      for (const u of store.values()) {
        if (u.id === id) return u;
      }
      return null;
    },
    async create(user) {
      store.set(user.email, user);
    },
  };
}

const JWT_SECRET = 'test-secret';

describe('Login', () => {
  it('should login with correct credentials', async () => {
    const repo = createMockRepository();
    const register = createRegister(repo, JWT_SECRET);
    const login = createLogin(repo, JWT_SECRET);

    await register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const result = await login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe('test@example.com');
      expect(result.value.token).toBeDefined();
    }
  });

  it('should fail with wrong email', async () => {
    const login = createLogin(createMockRepository(), JWT_SECRET);

    const result = await login({
      email: 'nonexistent@example.com',
      password: 'password123',
    });

    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('should fail with wrong password', async () => {
    const repo = createMockRepository();
    const register = createRegister(repo, JWT_SECRET);
    const login = createLogin(repo, JWT_SECRET);

    await register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const result = await login({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });
});
