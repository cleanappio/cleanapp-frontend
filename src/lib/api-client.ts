// This would be your API client implementation from the provided files
// I'm including a simplified version here

import axios, { AxiosInstance } from 'axios';

export interface Customer {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  customer_id: string;
  plan_type: 'base' | 'advanced' | 'exclusive';
  billing_cycle: 'monthly' | 'annual';
  status: 'active' | 'suspended' | 'cancelled';
  start_date: string;
  next_billing_date: string;
}

export interface PaymentMethod {
  id: number;
  customer_id: string;
  stripe_payment_method_id: string;
  last_four: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

class ApiClient {
  private axios: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.axios = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

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

  async login(email: string, password: string) {
    const { data } = await this.axios.post('/api/v3/login', { email, password });
    this.setAuthToken(data.token);
    return data;
  }

  async signup(name: string, email: string, password: string, area_ids: number[]) {
    const { data } = await this.axios.post('/api/v3/customers', {
      name,
      email,
      password,
      area_ids
    });
    return data;
  }

  async getCurrentCustomer() {
    const { data } = await this.axios.get<Customer>('/api/v3/customers/me');
    return data;
  }

  async getCurrentSubscription() {
    const { data } = await this.axios.get<Subscription>('/api/v3/subscriptions/me');
    return data;
  }

  async createSubscription(plan_type: string, billing_cycle: 'monthly' | 'annual', payment_method_id: string) {
    const { data } = await this.axios.post('/api/v3/subscriptions', {
      plan_type,
      billing_cycle,
      stripe_payment_method_id: payment_method_id
    });
    return data;
  }

  async cancelSubscription() {
    const { data } = await this.axios.delete('/api/v3/subscriptions/me');
    return data;
  }

  async getPaymentMethods() {
    const { data } = await this.axios.get<PaymentMethod[]>('/api/v3/payment-methods');
    return data;
  }

  async addPaymentMethod(stripe_payment_method_id: string, is_default = false) {
    const { data } = await this.axios.post('/api/v3/payment-methods', {
      stripe_payment_method_id,
      is_default
    });
    return data;
  }
}

export const apiClient = new ApiClient();
