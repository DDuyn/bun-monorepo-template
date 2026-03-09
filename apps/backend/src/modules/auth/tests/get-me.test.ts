import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@repo/shared';
import { User } from '../domain/user';
import type { AuthRepository } from '../infrastructure/auth.repository';
import { createGetMe } from '../use-cases/get-me';

function createMockRepository(users: User[] = []): AuthRepository {
  const store = new Map<string, User>();
  for (const u of users) store.set(u.id, u);

  return {
    async findByEmail(email) {
      for (const u of store.values()) {
        if (u.email === email) return u;
      }
      return null;
    },
    async findById(id) {
      return store.get(id) ?? null;
    },
    async create(user) {
      store.set(user.id, user);
    },
  };
}

const mockUser = User.fromPersistence({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hash',
  createdAt: new Date(),
});

describe('GetMe', () => {
  it('should return user data for a valid userId', async () => {
    const repo = createMockRepository([mockUser]);
    const getMe = createGetMe(repo);

    const result = await getMe('user-1');

    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('user-1');
      expect(result.value.email).toBe('test@example.com');
      expect(result.value.name).toBe('Test User');
    }
  });

  it('should return NOT_FOUND for an unknown userId', async () => {
    const getMe = createGetMe(createMockRepository());

    const result = await getMe('nonexistent-id');

    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
