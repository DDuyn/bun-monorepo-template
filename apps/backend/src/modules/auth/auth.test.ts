import { describe, it, expect, beforeEach } from 'bun:test';
import { type AppError, isOk, isErr } from '@repo/shared';
import { User } from './auth.domain';
import type { AuthRepository } from './auth.repository';
import { createAuthService } from './auth.service';

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

describe('AuthService', () => {
  const JWT_SECRET = 'test-secret';

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const repo = createMockRepository();
      const service = createAuthService(repo, JWT_SECRET);

      const result = await service.register({
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
      const repo = createMockRepository([existingUser]);
      const service = createAuthService(repo, JWT_SECRET);

      const result = await service.register({
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

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const repo = createMockRepository();
      const service = createAuthService(repo, JWT_SECRET);

      await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const result = await service.login({
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
      const repo = createMockRepository();
      const service = createAuthService(repo, JWT_SECRET);

      const result = await service.login({
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
      const service = createAuthService(repo, JWT_SECRET);

      await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(isErr(result)).toBe(true);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });
});

describe('User domain', () => {
  it('should create a valid user', () => {
    const result = User.create({
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      passwordHash: 'hash',
      createdAt: new Date(),
    });
    expect(isOk(result)).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = User.create({
      id: '1',
      email: 'invalid',
      name: 'Test',
      passwordHash: 'hash',
      createdAt: new Date(),
    });
    expect(isErr(result)).toBe(true);
  });

  it('should reject empty name', () => {
    const result = User.create({
      id: '1',
      email: 'test@example.com',
      name: '  ',
      passwordHash: 'hash',
      createdAt: new Date(),
    });
    expect(isErr(result)).toBe(true);
  });

  it('should produce a response without passwordHash', () => {
    const user = User.fromPersistence({
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      passwordHash: 'hash',
      createdAt: new Date(),
    });
    const response = user.toResponse();
    expect(response).toEqual({ id: '1', email: 'test@example.com', name: 'Test' });
    expect((response as Record<string, unknown>).passwordHash).toBeUndefined();
  });
});
