import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { User } from '../domain/user';
import type { AuthRepository } from '../infrastructure/auth.repository';
import { createRegister } from '../use-cases/register';

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

describe('Register', () => {
  it('should register a new user successfully', async () => {
    const register = createRegister(createMockRepository(), JWT_SECRET);

    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe('test@example.com');
      expect(result.value.user.name).toBe('Test User');
      expect(result.value.token).toBeDefined();
    }
  });

  it('should fail if email already exists', async () => {
    const existingUser = User.fromPersistence({
      id: '1',
      email: 'test@example.com',
      name: 'Existing',
      passwordHash: 'hash',
      createdAt: new Date(),
    });
    const register = createRegister(createMockRepository([existingUser]), JWT_SECRET);

    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      name: 'New User',
    });

    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });
});
