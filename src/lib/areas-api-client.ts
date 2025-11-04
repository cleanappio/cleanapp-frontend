import axios, { AxiosInstance } from "axios";
import { authApiClient } from "./auth-api-client";
import { Feature } from "geojson";

// ==================== INTERFACES ====================

export interface ContactEmail {
  email: string;
  consent_report: boolean;
}

export interface Area {
  id?: number;
  name: string;
  description?: string;
  is_custom?: boolean;
  type: "poi" | "admin";
  contact_name?: string;
  contact_emails?: ContactEmail[];
  coordinates: Feature;
  created_at: string;
  updated_at: string;
}

export interface ViewPort {
  lat_min: number;
  lon_min: number;
  lat_max: number;
  lon_max: number;
}

export interface CreateOrUpdateAreaRequest {
  area: Area;
}

export interface AreasResponse {
  areas: Area[];
}

export interface AreasCountResponse {
  count: number;
}

export interface UpdateConsentRequest {
  version: string;
  contact_email: ContactEmail;
}

export interface CreateAreaResponse {
  area_id: number;
  message: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
  code?: string;
}

// ==================== AREAS API CLIENT ====================

export class AreasApiClient {
  private axios: AxiosInstance;

  constructor() {
    if (!process.env.NEXT_PUBLIC_AREAS_API_URL) {
      throw new Error("NEXT_PUBLIC_AREAS_API_URL is not set.");
    }

    // Direct client - communicates directly with the areas backend
    this.axios = axios.create({
      baseURL: process.env.NEXT_PUBLIC_AREAS_API_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    // Request interceptor for direct client
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

    // Response interceptor for direct client
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token on unauthorized
          authApiClient.setAuthToken(null);
          // Only redirect if in browser context and not on login or checkout pages
          if (
            typeof window !== "undefined" &&
            window.location.pathname !== "/login" &&
            window.location.pathname !== "/checkout"
          ) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== HEALTH ENDPOINT ====================

  /**
   * Health check endpoint
   * GET /health
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const { data } = await this.axios.get<HealthCheckResponse>("/health");
    return data;
  }

  // ==================== AREAS ENDPOINTS ====================

  /**
   * Create or update an area
   * POST /api/v3/create_or_update_area
   */
  async createOrUpdateArea(
    request: CreateOrUpdateAreaRequest
  ): Promise<CreateAreaResponse> {
    // Ensure description is always an empty string, never null or undefined
    const sanitizedArea = {
      ...request.area,
      description: request.area.description ?? "",
    };
    const sanitizedRequest = {
      ...request,
      area: sanitizedArea,
    };

    console.log("Creating/updating area:", sanitizedRequest);

    try {
      const response = await this.axios.post<CreateAreaResponse>(
        "/api/v3/create_or_update_area",
        sanitizedRequest
      );
      console.log("Area created/updated successfully:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error creating/updating area:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        area: sanitizedArea,
      });
      throw error;
    }
  }

  /**
   * Get areas with optional viewport filtering
   * GET /api/v3/get_areas
   */
  async getAreas(
    viewport?: ViewPort,
    type?: "admin" | "poi"
  ): Promise<AreasResponse> {
    const params: Record<string, string> = {};

    if (viewport) {
      params.sw_lat = viewport.lat_min.toString();
      params.sw_lon = viewport.lon_min.toString();
      params.ne_lat = viewport.lat_max.toString();
      params.ne_lon = viewport.lon_max.toString();
    }

    if (type) {
      params.type = type;
    }

    try {
      const { data } = await this.axios.get<AreasResponse>(
        "/api/v3/get_areas",
        { params }
      );
      return data;
    } catch (error: any) {
      console.error("Areas API Error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config,
      });
      throw error;
    }
  }

  /**
   * Get areas count
   * GET /api/v3/get_areas_count
   */
  async getAreasCount(): Promise<AreasCountResponse> {
    try {
      const { data } = await this.axios.get<AreasCountResponse>(
        "/api/v3/get_areas_count"
      );
      console.log("Areas count fetched successfully:", data);
      return data;
    } catch (error: any) {
      console.error("Error fetching areas count:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Update email consent
   * POST /api/v3/update_consent
   */
  async updateConsent(
    contactEmail: string,
    consentReport: boolean
  ): Promise<void> {
    const request = {
      contact_email: {
        email: contactEmail,
        consent_report: consentReport,
      },
    };

    console.log("Updating consent:", request);

    try {
      const response = await this.axios.post("/api/v3/update_consent", request);
      console.log("Consent updated successfully:", response.data);
    } catch (error: any) {
      console.error("Error updating consent:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        contactEmail,
        consentReport,
      });
      throw error;
    }
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Create a new area with default version
   */
  async createArea(area: Area): Promise<CreateAreaResponse> {
    const request: CreateOrUpdateAreaRequest = {
      area,
    };

    return await this.createOrUpdateArea(request);
  }

  /**
   * Update an existing area
   */
  async updateArea(area: Area): Promise<CreateAreaResponse> {
    const request: CreateOrUpdateAreaRequest = {
      area,
    };

    // Note: The backend may need to be updated to handle area updates properly
    // For now, we'll use the same endpoint as create
    return await this.createOrUpdateArea(request);
  }

  /**
   * Get POI areas within a bounding box
   */
  async getPOIAreasInBounds(
    latMin: number,
    lonMin: number,
    latMax: number,
    lonMax: number
  ): Promise<AreasResponse> {
    const viewport: ViewPort = {
      lat_min: latMin,
      lon_min: lonMin,
      lat_max: latMax,
      lon_max: lonMax,
    };

    return await this.getAreas(viewport, "poi");
  }

  /**
   * Get admin areas within a bounding box
   */
  async getAdminAreasInBounds(
    latMin: number,
    lonMin: number,
    latMax: number,
    lonMax: number
  ): Promise<AreasResponse> {
    const viewport: ViewPort = {
      lat_min: latMin,
      lon_min: lonMin,
      lat_max: latMax,
      lon_max: lonMax,
    };

    return await this.getAreas(viewport, "admin");
  }
}

// ==================== SINGLETON INSTANCE ====================

export const areasApiClient = new AreasApiClient();
