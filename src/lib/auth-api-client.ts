import axios, { AxiosInstance } from "axios";

// ==================== INTERFACES ====================

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
  provider: "google" | "facebook" | "apple";
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

export interface User {
  id: string;
  name: string;
  email: string;
  area_ids?: number[];
  created_at: string;
  updated_at: string;
}

// ==================== AUTH API CLIENT ====================

export class AuthApiClient {
  private axios: AxiosInstance;
  private token: string | null = null;

  constructor() {
    if (!process.env.NEXT_PUBLIC_AUTH_API_URL) {
      throw "NEXT_PUBLIC_AUTH_API_URL is not set.";
    }
    this.axios = axios.create({
      baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // 30 second timeout
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
          // Only redirect if in browser context and not on public pages
          if (typeof window !== "undefined") {
            const publicPaths = ["/login", "/checkout", "/", "/pricing"];
            const currentPath = window.location.pathname;
            if (!publicPaths.includes(currentPath)) {
              window.location.href = "/login";
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== AUTH MANAGEMENT ====================

  setAuthToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
  }

  getAuthToken(): string | null {
    return this.token;
  }

  loadTokenFromStorage(): void {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        this.token = token;
      }
    }
  }

  // ==================== AUTHENTICATION ENDPOINTS ====================

  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await this.axios.post<TokenResponse>(
      "/api/v3/auth/login",
      {
        email,
        password,
      }
    );
    this.setAuthToken(data.token);
    return data;
  }

  async forgotPassword(email: string): Promise<MessageResponse> {
    const { data } = await this.axios.post<MessageResponse>("/api/v3/auth/forgot-password", {
      email,
    });
    return data;
  }

  async resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    const { data } = await this.axios.post<MessageResponse>("/api/v3/auth/reset-password", {
      token,
      new_password: newPassword,
    });
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.axios.post("/api/v3/auth/logout");
    } catch (e) {
      console.error("Error logging out:", e);
    } finally {
      this.setAuthToken(null);
    }
  }

  async refreshToken(refreshToken?: string): Promise<TokenResponse> {
    const { data } = await this.axios.post<TokenResponse>(
      "/api/v3/auth/refresh",
      {
        refresh_token: refreshToken || this.getRefreshToken(),
      }
    );
    this.setAuthToken(data.token);
    return data;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token");
    }
    return null;
  }

  // OAuth methods (for when backend implements them)
  async loginWithOAuth(
    provider: "google" | "facebook" | "apple",
    credential: string
  ): Promise<TokenResponse> {
    const payload: OAuthLoginRequest = {
      provider,
      ...(provider === "apple"
        ? { authorization_code: credential }
        : { id_token: credential }),
    };

    const { data } = await this.axios.post<TokenResponse>(
      "/api/v3/auth/oauth",
      payload
    );
    this.setAuthToken(data.token);
    return data;
  }

  async getOAuthUrl(
    provider: "google" | "facebook" | "apple"
  ): Promise<OAuthUrlResponse> {
    const { data } = await this.axios.get<OAuthUrlResponse>(
      `/api/v3/auth/oauth/${provider}`
    );
    return data;
  }

  async signup(
    name: string,
    email: string,
    password: string,
    area_ids: number[] = [1]
  ): Promise<User> {
    const { data } = await this.axios.post<User>("/api/v3/auth/register", {
      name,
      email,
      password,
      area_ids,
    });
    return data;
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await this.axios.get<User>("/api/v3/users/me");
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
      const { data } = await this.axios.get<{ user_exists: boolean }>(
        `/api/v3/users/exists`,
        { params: { email } }
      );
      return !!data.user_exists;
    } catch (error: any) {
      // If API returns 404 or similar, treat as not found
      if (error?.response?.status === 404) return false;
      throw error;
    }
  }
}

// Export singleton instance
export const authApiClient = new AuthApiClient();

// Initialize token from storage on load
if (typeof window !== "undefined") {
  authApiClient.loadTokenFromStorage();
}
