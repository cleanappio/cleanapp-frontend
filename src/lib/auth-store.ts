import { create } from 'zustand';
import { apiClient, Customer } from './api-client';

interface AuthState {
  user: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginWithApple: (authorizationCode: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<Customer>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await apiClient.login(email, password);
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token);
    }
    const user = await apiClient.getCurrentCustomer();
    set({ user, isAuthenticated: true });
  },

  loginWithGoogle: async (credential) => {
    try {
      const response = await apiClient.loginWithOAuth('google', credential);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      const user = await apiClient.getCurrentCustomer();
      set({ user, isAuthenticated: true });
    } catch (error: any) {
      // If OAuth endpoint doesn't exist yet, throw appropriate error
      if (error.response?.status === 404) {
        throw new Error('OAuth login not yet implemented on server');
      }
      throw error;
    }
  },

  loginWithFacebook: async (accessToken) => {
    try {
      const response = await apiClient.loginWithOAuth('facebook', accessToken);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      const user = await apiClient.getCurrentCustomer();
      set({ user, isAuthenticated: true });
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('OAuth login not yet implemented on server');
      }
      throw error;
    }
  },

  loginWithApple: async (authorizationCode) => {
    try {
      const response = await apiClient.loginWithOAuth('apple', authorizationCode);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      const user = await apiClient.getCurrentCustomer();
      set({ user, isAuthenticated: true });
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('OAuth login not yet implemented on server');
      }
      throw error;
    }
  },

  signup: async (name, email, password) => {
    const customer = await apiClient.signup(name, email, password);
    // Login after signup
    const loginResponse = await apiClient.login(email, password);
    if (loginResponse.refresh_token) {
      localStorage.setItem('refresh_token', loginResponse.refresh_token);
    }
    set({ user: customer, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.setAuthToken(null);
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      apiClient.setAuthToken(token);
      try {
        const user = await apiClient.getCurrentCustomer();
        set({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        // Token might be expired, try to refresh
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const response = await apiClient.refreshToken(refreshToken);
            if (response.refresh_token) {
              localStorage.setItem('refresh_token', response.refresh_token);
            }
            const user = await apiClient.getCurrentCustomer();
            set({ user, isAuthenticated: true, isLoading: false });
          } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    } else {
      set({ isLoading: false });
    }
  },

  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...updates } });
    }
  }
}));