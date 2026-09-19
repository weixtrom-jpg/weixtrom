import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { api } from '../lib/api';
import { storage } from '../lib/storage';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  async function checkAuth() {
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch {
      await storage.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', { email, password });

    await storage.setAccessToken(res.accessToken);
    await storage.setRefreshToken(res.refreshToken);
    setUser(res.user);
  }

  async function logout() {
    const refreshToken = await storage.getRefreshToken();
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }); } catch {}
    }
    await storage.clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
