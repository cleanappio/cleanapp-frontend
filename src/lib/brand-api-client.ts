import axios, { AxiosInstance } from 'axios';
import { authApiClient } from './auth-api-client';

// ==================== INTERFACES ====================

export interface Brand {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandsResponse {
  brands: Brand[];
}

export interface BrandReportsResponse {
  reports: any[]; // Using the same Report interface from MontenegroMap
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

// ==================== BRAND API CLIENT ====================

export class BrandApiClient {
  private axios: AxiosInstance;

  constructor(apiUrl: string) {
    if (!apiUrl) {
      throw 'API URL is not set.';
    }
    this.axios = axios.create({
      baseURL: apiUrl,
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

  // ==================== BRAND ENDPOINTS ====================

  /**
   * Get all available brands
   * @returns Promise<BrandsResponse> List of all brands
   */
  async getBrands(): Promise<BrandsResponse> {
    const { data } = await this.axios.get<BrandsResponse>('/brands');
    return data;
  }

  /**
   * Get reports for a specific brand
   * @param brandId The ID of the brand to get reports for
   * @param params Optional pagination parameters
   * @returns Promise<BrandReportsResponse> Reports for the specified brand
   */
  async getBrandReports(brandId: string, params?: PaginationParams): Promise<BrandReportsResponse> {
    const { data } = await this.axios.get<BrandReportsResponse>(`/reports`, {
      params: {
        brand: brandId,
        n: params?.limit || 100
      }
    });
    return data;
  }

  /**
   * Check the health of the RedBull API
   * @returns Promise<{ status: string; timestamp: string }> Health status
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const { data } = await this.axios.get<{ status: string; timestamp: string }>('/health');
    return data;
  }
}

// Export singleton instance
export const redbullApiClient = new BrandApiClient(process.env.NEXT_PUBLIC_REDBULL_API_URL || ''); 