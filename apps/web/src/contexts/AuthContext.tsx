import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await api.get<User>('/auth/me');
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', { email, password });

    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    setState({ user: res.user, isLoading: false, isAuthenticated: true });
  };

  const register = async (data: RegisterData) => {
    return api.post<{ message: string }>('/auth/register', data);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // Ignorar errores de logout
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  const forgotPassword = async (email: string) => {
    return api.post<{ message: string }>('/auth/forgot-password', { email });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
