import type { AuthResponse, LoginInput, RegisterInput } from '@repo/shared';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  auth: {
    login: (data: LoginInput) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    register: (data: RegisterInput) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  items: {
    list: (page = 1, limit = 20) =>
      request<{ items: unknown[]; total: number; page: number; limit: number }>(
        `/items?page=${page}&limit=${limit}`,
      ),
    get: (id: string) => request(`/items/${id}`),
    create: (data: { name: string; description?: string }) =>
      request('/items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string }) =>
      request(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    activate: (id: string) =>
      request(`/items/${id}/activate`, { method: 'POST' }),
    deactivate: (id: string) =>
      request(`/items/${id}/deactivate`, { method: 'POST' }),
    delete: (id: string) =>
      request(`/items/${id}`, { method: 'DELETE' }),
  },
};
