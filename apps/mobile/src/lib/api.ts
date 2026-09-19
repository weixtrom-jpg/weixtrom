import { storage } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await storage.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (response.status === 401) {
      await storage.clearTokens();
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error del servidor' }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  },

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },
};
