import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '../types';
import { authAPI } from '../services/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (data: LoginRequest) => Promise<{ token: string; user: User }>;
  register: (data: RegisterRequest) => Promise<{ token: string; user: User }>;
  logout: () => void;
  setAuth: (data: { user: User; token: string }) => void;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    try {
      set({ loading: true, initialized: false });
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          await authAPI.validateToken();
          set({ user: JSON.parse(userStr), token, loading: false, initialized: true });
        } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
          set({ user: null, token: null, loading: false, initialized: true });
        }
      } else {
      set({ user: null, token: null, loading: false, initialized: true });
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },

  login: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await authAPI.login(data);
      
      // 保存到localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      set({ user: response.data.user, token: response.data.token, loading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    try {
      const response = await authAPI.register(data);
      
      // 保存到localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // 设置用户状态
      set({
        user: response.data.user,
        token: response.data.token,
        loading: false,
        error: null
      });
      
      return response.data;
    } catch (error) {
      set({ loading: false, error: 'Registration failed' });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastPath');
    set({ user: null, token: null, error: null });
  },

  setAuth: (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },
})); 