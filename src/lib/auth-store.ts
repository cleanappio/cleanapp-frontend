import { create } from 'zustand';
import { apiClient, Customer, Subscription, PaymentMethod, BillingHistory, Price } from './api-client';

interface AuthState {
  // User state
  user: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Billing state
  subscription: Subscription | null;
  paymentMethods: PaymentMethod[];
  billingHistory: BillingHistory[];
  billingLoading: boolean;
  prices: Price[];
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginWithApple: (authorizationCode: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<Customer>) => void;
  
  // Billing actions
  fetchBillingData: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  fetchPaymentMethods: () => Promise<void>;
  fetchBillingHistory: (page?: number, limit?: number) => Promise<void>;
  
  // Subscription actions
  createSubscription: (planType: string, billingCycle: 'monthly' | 'annual', paymentMethodId: string) => Promise<void>;
  updateSubscription: (planType: string, billingCycle: 'monthly' | 'annual') => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  
  // Payment method actions
  addPaymentMethod: (stripePaymentMethodId: string, isDefault?: boolean) => Promise<PaymentMethod>;
  setDefaultPaymentMethod: (id: number) => Promise<void>;
  deletePaymentMethod: (id: number) => Promise<void>;

  // Pricing actions
  fetchPrices: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  subscription: null,
  paymentMethods: [],
  billingHistory: [],
  billingLoading: false,
  prices: [],

  // Auth actions
  login: async (email, password) => {
    const response = await apiClient.login(email, password);
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token);
    }
    const user = await apiClient.getCurrentCustomer();
    set({ user, isAuthenticated: true });
    // Fetch billing data after successful login
    get().fetchBillingData();
  },

  loginWithGoogle: async (credential) => {
    try {
      const response = await apiClient.loginWithOAuth('google', credential);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      const user = await apiClient.getCurrentCustomer();
      set({ user, isAuthenticated: true });
      get().fetchBillingData();
    } catch (error: any) {
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
      get().fetchBillingData();
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
      get().fetchBillingData();
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
    get().fetchBillingData();
  },

  logout: async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.setAuthToken(null);
      localStorage.removeItem('refresh_token');
      set({ 
        user: null, 
        isAuthenticated: false,
        subscription: null,
        paymentMethods: [],
        billingHistory: []
      });
    }
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      apiClient.setAuthToken(token);
      try {
        const user = await apiClient.getCurrentCustomer();
        set({ user, isAuthenticated: true, isLoading: false });
        get().fetchBillingData();
      } catch {
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
            get().fetchBillingData();
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
  },

  // Billing data actions
  fetchBillingData: async () => {
    set({ billingLoading: true });
    try {
      const [sub, methods, history] = await Promise.all([
        apiClient.getCurrentSubscription().catch(() => null),
        apiClient.getPaymentMethods().catch(() => []),
        apiClient.getBillingHistory({ limit: 10 }).catch(() => ({ data: [], pagination: { page: 1, limit: 10 } }))
      ]);

      set({
        subscription: sub,
        paymentMethods: methods || [],
        billingHistory: history?.data || [],
        billingLoading: false
      });
    } catch (error) {
      console.error('Billing data error:', error);
      set({
        paymentMethods: [],
        billingHistory: [],
        billingLoading: false
      });
      throw error;
    }
  },

  fetchSubscription: async () => {
    try {
      const sub = await apiClient.getCurrentSubscription();
      set({ subscription: sub });
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      set({ subscription: null });
    }
  },

  fetchPaymentMethods: async () => {
    try {
      const methods = await apiClient.getPaymentMethods();
      set({ paymentMethods: methods || [] });
    } catch (error) {
      set({ paymentMethods: [] });
      throw error;
    }
  },

  fetchBillingHistory: async (page = 1, limit = 10) => {
    try {
      const history = await apiClient.getBillingHistory({ page, limit });
      set({ billingHistory: history?.data || [] });
    } catch (error) {
      set({ billingHistory: [] });
      throw error;
    }
  },

  // Subscription actions
  createSubscription: async (planType, billingCycle, paymentMethodId) => {
    await apiClient.createSubscription(planType, billingCycle, paymentMethodId);
    await get().fetchSubscription();
  },

  updateSubscription: async (planType, billingCycle) => {
    const sub = await apiClient.updateSubscription(planType, billingCycle);
    set({ subscription: sub });
  },

  cancelSubscription: async () => {
    await apiClient.cancelSubscription();
    set({ subscription: null });
  },

  reactivateSubscription: async () => {
    const sub = await apiClient.reactivateSubscription();
    set({ subscription: sub });
  },

  // Payment method actions
  addPaymentMethod: async (stripePaymentMethodId, isDefault = false) => {
    const method = await apiClient.addPaymentMethod(stripePaymentMethodId, isDefault);
    await get().fetchPaymentMethods();
    return method;
  },

  setDefaultPaymentMethod: async (id) => {
    await apiClient.setDefaultPaymentMethod(id);
    await get().fetchPaymentMethods();
  },

  deletePaymentMethod: async (id) => {
    await apiClient.deletePaymentMethod(id);
    set(state => ({
      paymentMethods: state.paymentMethods.filter(m => m.id !== id)
    }));
  },

  fetchPrices: async () => {
    try {
      const resp = await apiClient.getPrices();
      set({ prices: resp.prices || [] });
    } catch (error) {
      console.error('Error fetching prices:', error);
      set({ prices: [] });
      throw error;
    }
  }
}));