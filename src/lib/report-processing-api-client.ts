import axios, { AxiosInstance } from 'axios';
import { authApiClient } from './auth-api-client';

// ==================== INTERFACES ====================

export interface MarkFixedRequest {
  seq: number;
}

export interface MarkFixedResponse {
  success: boolean;
  message: string;
  seq: number;
  status: string;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
  code?: string;
}

// ==================== REPORT PROCESSING API CLIENT ====================

export class ReportProcessingApiClient {
  private axios: AxiosInstance;

  constructor() {
    if (!process.env.NEXT_PUBLIC_REPORT_PROCESSING_API_URL) {
      throw 'NEXT_PUBLIC_REPORT_PROCESSING_API_URL is not set.';
    }
    this.axios = axios.create({
      baseURL: process.env.NEXT_PUBLIC_REPORT_PROCESSING_API_URL,
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

  // ==================== REPORT ENDPOINTS ====================

  /**
   * Mark a report as fixed
   * @param request The mark fixed request containing the sequence number
   * @returns Promise<MarkFixedResponse> Response indicating success/failure
   */
  async markFixed(request: MarkFixedRequest): Promise<MarkFixedResponse> {
    const { data } = await this.axios.post<MarkFixedResponse>('/api/v3/reports/mark_resolved', request);
    return data;
  }

  /**
   * Check the health of the Report Processing API
   * @returns Promise<{ status: string; timestamp: string }> Health status
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const { data } = await this.axios.get<{ status: string; timestamp: string }>('/health');
    return data;
  }
}

// Export singleton instance
export const reportProcessingApiClient = new ReportProcessingApiClient(); 