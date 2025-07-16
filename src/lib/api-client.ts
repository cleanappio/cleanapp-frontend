import axios, { AxiosInstance } from 'axios';
import { authApiClient } from './auth-api-client';

// ==================== INTERFACES ====================

export interface Customer {
  id: string;
  name: string;
  email: string;
  area_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  area_ids?: number[];
  password?: string;
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

export interface Price {
  product: string;
  period: string;
  amount: number;
  currency: string;
}

export interface PricesResponse {
  prices: Price[];
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

// ==================== BRAND ENDPOINTS ====================

export interface CustomerBrandsResponse {
  customer_id: string;
  brand_names: string[];
}

export interface AddCustomerBrandsRequest {
  brand_names: string[];
}

export interface RemoveCustomerBrandsRequest {
  brand_names: string[];
}

export interface UpdateCustomerBrandsRequest {
  brand_names: string[];
}

// ==================== API CLIENT ====================

export class ApiClient {
  private axios: AxiosInstance;

  constructor() {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw 'NEXT_PUBLIC_API_URL is not set.';
    }
    this.axios = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        const token = authApiClient.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
          authApiClient.setAuthToken(null);
          // Only redirect if in browser context and not on login or checkout pages
          if (typeof window !== 'undefined' && 
              window.location.pathname !== '/login' && 
              window.location.pathname !== '/checkout') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== CUSTOMER ENDPOINTS ====================

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
    authApiClient.setAuthToken(null);
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

  // ==================== BRAND ENDPOINTS ====================

  async getCustomerBrands(): Promise<CustomerBrandsResponse> {
    const { data } = await this.axios.get<CustomerBrandsResponse>('/api/v3/customers/me/brands');
    return data;
  }

  async addCustomerBrands(brandNames: string[]): Promise<MessageResponse> {
    const { data } = await this.axios.post<MessageResponse>('/api/v3/customers/me/brands', {
      brand_names: brandNames
    });
    return data;
  }

  async updateCustomerBrands(brandNames: string[]): Promise<MessageResponse> {
    const { data } = await this.axios.put<MessageResponse>('/api/v3/customers/me/brands', {
      brand_names: brandNames
    });
    return data;
  }

  async removeCustomerBrands(brandNames: string[]): Promise<MessageResponse> {
    const { data } = await this.axios.delete<MessageResponse>('/api/v3/customers/me/brands', {
      data: {
        brand_names: brandNames
      }
    });
    return data;
  }

  // ==================== UTILITY ENDPOINTS ====================

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const { data } = await this.axios.get<{ status: string; timestamp: string }>('/health');
    return data;
  }

  async getPrices(): Promise<PricesResponse> {
    const { data } = await this.axios.get<PricesResponse>('/api/v3/prices');
    console.log('Fetched prices:', data);
    return data;
  }

  // ==================== USER UTILITY ENDPOINTS ====================

  /**
   * Checks if a user exists by email.
   * @param email The email to check.
   * @returns Promise<boolean> true if user exists, false otherwise
   */
  async userExists(email: string): Promise<boolean> {
    try {
      const { data } = await this.axios.get<{ user_exists: boolean }>(`/api/v3/users/exists`, { params: { email } });
      return !!data.user_exists;
    } catch (error: any) {
      // If API returns 404 or similar, treat as not found
      if (error?.response?.status === 404) return false;
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();