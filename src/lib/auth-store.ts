import { create } from 'zustand';
import { apiClient, Customer } from './api-client';

interface AuthState {
  user: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await apiClient.login(email, password);
    const user = await apiClient.getCurrentCustomer();
    set({ user, isAuthenticated: true });
  },

  signup: async (name, email, password) => {
    const customer = await apiClient.signup(name, email, password, [1]); // Default area
    const loginResponse = await apiClient.login(email, password);
    set({ user: customer, isAuthenticated: true });
  },

  logout: () => {
    apiClient.setAuthToken(null);
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      apiClient.setAuthToken(token);
      try {
        const user = await apiClient.getCurrentCustomer();
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  }
}));
