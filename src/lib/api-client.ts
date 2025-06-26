import axios, { AxiosInstance } from 'axios';

// ==================== INTERFACES ====================

export interface Customer {
  id: string;
  name: string;
  email: string;
  area_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  customer_id: string;
  plan_type: 'base' | 'advanced' | 'exclusive';
  billing_cycle: 'monthly' | 'annual';
  status: 'active' | 'suspended' | 'canceled';
  start_date: string;
  next_billing_date: string;
  current_period_end?: string;
  stripe_subscription_id?: string;
}

export interface PaymentMethod {
  id: number;
  customer_id: string;
  stripe_payment_method_id: string;
  stripe_customer_id: string;
  last_four: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  cardholder_name?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BillingHistory {
  id: number;
  customer_id: string;
  subscription_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_date: string;
  stripe_payment_intent_id?: string;
  description?: string;
}

export interface BillingHistoryResponse {
  data: BillingHistory[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    total_pages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
  code?: string;
}

export interface MessageResponse {
  message: string;
  success?: boolean;
}

export interface TokenResponse {
  token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

// OAuth interfaces (for future backend implementation)
export interface OAuthLoginRequest {
  provider: 'google' | 'facebook' | 'apple';
  id_token?: string;
  access_token?: string;
  authorization_code?: string;
  user_info?: {
    email?: string;
    name?: string;
    picture?: string;
  };
}

export interface OAuthUrlResponse {
  url: string;
  state?: string;
}

// Request interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  area_ids?: number[];
}

export interface CreateSubscriptionRequest {
  plan_type: 'base' | 'advanced' | 'exclusive';
  billing_cycle: 'monthly' | 'annual';
  stripe_payment_method_id: string;
}

export interface AddPaymentMethodRequest {
  stripe_payment_method_id: string;
  is_default?: boolean;
}

export interface UpdatePaymentMethodRequest {
  is_default: boolean;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  area_ids?: number[];
  password?: string;
}

// ==================== API CLIENT ====================

export class ApiClient {
  private axios: AxiosInstance;
  private token: string | null = null;

  constructor() {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw 'NEXT_PUBLIC_API_URL is not set.';
    }
    this.axios = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token on unauthorized
          this.setAuthToken(null);
          // Only redirect if in browser context
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== AUTH MANAGEMENT ====================

  setAuthToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getAuthToken(): string | null {
    return this.token;
  }

  loadTokenFromStorage(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.token = token;
      }
    }
  }

  // ==================== AUTHENTICATION ENDPOINTS ====================

  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await this.axios.post<TokenResponse>('/api/v3/auth/login', {
      email,
      password
    });
    this.setAuthToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.axios.post('/api/v3/auth/logout');
    } finally {
      this.setAuthToken(null);
    }
  }

  async refreshToken(refreshToken?: string): Promise<TokenResponse> {
    const { data } = await this.axios.post<TokenResponse>('/api/v3/auth/refresh', {
      refresh_token: refreshToken || this.getRefreshToken()
    });
    this.setAuthToken(data.token);
    return data;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  // OAuth methods (for when backend implements them)
  async loginWithOAuth(provider: 'google' | 'facebook' | 'apple', credential: string): Promise<TokenResponse> {
    const payload: OAuthLoginRequest = {
      provider,
      ...(provider === 'apple' ? { authorization_code: credential } : { id_token: credential })
    };
    
    const { data } = await this.axios.post<TokenResponse>('/api/v3/auth/oauth', payload);
    this.setAuthToken(data.token);
    return data;
  }

  async getOAuthUrl(provider: 'google' | 'facebook' | 'apple'): Promise<OAuthUrlResponse> {
    const { data } = await this.axios.get<OAuthUrlResponse>(`/api/v3/auth/oauth/${provider}`);
    return data;
  }

  // ==================== CUSTOMER ENDPOINTS ====================

  async signup(name: string, email: string, password: string, area_ids: number[] = [1]): Promise<Customer> {
    const { data } = await this.axios.post<Customer>('/api/v3/customers', {
      name,
      email,
      password,
      area_ids
    });
    return data;
  }

  async getCurrentCustomer(): Promise<Customer> {
    const { data } = await this.axios.get<Customer>('/api/v3/customers/me');
    return data;
  }

  async updateCustomer(updates: UpdateCustomerRequest): Promise<Customer> {
    const { data } = await this.axios.put<Customer>('/api/v3/customers/me', updates);
    return data;
  }

  async deleteCustomer(): Promise<MessageResponse> {
    const { data } = await this.axios.delete<MessageResponse>('/api/v3/customers/me');
    this.setAuthToken(null);
    return data;
  }

  // ==================== SUBSCRIPTION ENDPOINTS ====================

  async getCurrentSubscription(): Promise<Subscription> {
    const { data } = await this.axios.get<Subscription>('/api/v3/subscriptions/me');
    return data;
  }

  async createSubscription(
    plan_type: string, 
    billing_cycle: 'monthly' | 'annual', 
    payment_method_id: string
  ): Promise<Subscription> {
    const { data } = await this.axios.post<Subscription>('/api/v3/subscriptions', {
      plan_type,
      billing_cycle,
      stripe_payment_method_id: payment_method_id
    });
    return data;
  }

  async updateSubscription(
    plan_type: string, 
    billing_cycle: 'monthly' | 'annual'
  ): Promise<Subscription> {
    const { data } = await this.axios.put<Subscription>('/api/v3/subscriptions/me', {
      plan_type,
      billing_cycle
    });
    return data;
  }

  async cancelSubscription(): Promise<MessageResponse> {
    const { data } = await this.axios.delete<MessageResponse>('/api/v3/subscriptions/me');
    return data;
  }

  async reactivateSubscription(): Promise<Subscription> {
    const { data } = await this.axios.post<Subscription>('/api/v3/subscriptions/me/reactivate');
    return data;
  }

  // ==================== BILLING ENDPOINTS ====================

  async getBillingHistory(params?: PaginationParams): Promise<BillingHistoryResponse> {
    const { data } = await this.axios.get<BillingHistoryResponse>('/api/v3/billing/history', {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 10
      }
    });
    return data;
  }

  async downloadInvoice(billingHistoryId: number): Promise<Blob> {
    const { data } = await this.axios.get(`/api/v3/billing/invoices/${billingHistoryId}`, {
      responseType: 'blob'
    });
    return data;
  }

  // ==================== PAYMENT METHOD ENDPOINTS ====================

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await this.axios.get<PaymentMethod[]>('/api/v3/payment-methods');
    return data;
  }

  async addPaymentMethod(stripe_payment_method_id: string, is_default = false): Promise<PaymentMethod> {
    const { data } = await this.axios.post<PaymentMethod>('/api/v3/payment-methods', {
      stripe_payment_method_id,
      is_default
    });
    return data;
  }

  async updatePaymentMethod(id: number, updates: UpdatePaymentMethodRequest): Promise<PaymentMethod> {
    const { data } = await this.axios.put<PaymentMethod>(`/api/v3/payment-methods/${id}`, updates);
    return data;
  }

  async setDefaultPaymentMethod(id: number): Promise<PaymentMethod> {
    return this.updatePaymentMethod(id, { is_default: true });
  }

  async deletePaymentMethod(id: number): Promise<MessageResponse> {
    const { data } = await this.axios.delete<MessageResponse>(`/api/v3/payment-methods/${id}`);
    return data;
  }

  // ==================== UTILITY ENDPOINTS ====================

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const { data } = await this.axios.get<{ status: string; timestamp: string }>('/health');
    return data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Initialize token from storage on load
if (typeof window !== 'undefined') {
  apiClient.loadTokenFromStorage();
}