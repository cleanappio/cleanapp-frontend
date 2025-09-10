/**
 * Reverse Geocoding Service
 * Converts latitude and longitude coordinates to human-readable addresses
 * using Google Maps Geocoding API
 */

// ==================== INTERFACES ====================

export interface ReverseGeocodeResult {
  success: boolean;
  address?: string;
  error?: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface BatchReverseGeocodeResult extends ReverseGeocodeResult {
  coordinates: Coordinate;
}

export interface GoogleGeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type: string;
      viewport: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
    };
    place_id: string;
    types: string[];
  }>;
}

// ==================== CONSTANTS ====================

const GEO_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GEO_API_KEY) {
  console.warn("GEO_API_KEY environment variable is not set");
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates coordinate values
 */
const validateCoordinates = (
  latitude: number,
  longitude: number
): string | null => {
  if (!latitude || !longitude) {
    return "Latitude and longitude are required";
  }

  if (latitude < -90 || latitude > 90) {
    return "Invalid latitude value. Must be between -90 and 90";
  }

  if (longitude < -180 || longitude > 180) {
    return "Invalid longitude value. Must be between -180 and 180";
  }

  return null;
};

/**
 * Validates API key configuration
 */
const validateApiKey = (): string | null => {
  if (!GEO_API_KEY) {
    return "Geocoding API key is not configured";
  }
  return null;
};

// ==================== API FUNCTIONS ====================

/**
 * Reverse geocodes coordinates to get human-readable address
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @param language - The language for the response (default: 'en')
 * @returns Promise with geocoding result
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
  language: string = "en"
): Promise<ReverseGeocodeResult> => {
  try {
    // Validate input parameters
    const coordinateError = validateCoordinates(latitude, longitude);
    if (coordinateError) {
      return {
        success: false,
        error: coordinateError,
      };
    }

    // Construct the API URL for our Next.js API route
    const baseUrl = "/api/geocode";
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      language: language,
    });

    const url = `${baseUrl}?${params.toString()}`;

    // Make the API request to our Next.js API route
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const data: ReverseGeocodeResult = await response.json();
    return data;
  } catch (error) {
    // Handle network and other errors
    console.error("Reverse geocoding error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
};

/**
 * Batch reverse geocoding for multiple coordinates
 * @param coordinates - Array of coordinate objects
 * @param language - The language for the response (default: 'en')
 * @returns Promise with array of geocoding results
 */
export const batchReverseGeocode = async (
  coordinates: Coordinate[],
  language: string = "en"
): Promise<BatchReverseGeocodeResult[]> => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  // Process coordinates in parallel with rate limiting
  const batchSize = 5; // Process 5 coordinates at a time to avoid rate limits
  const results: BatchReverseGeocodeResult[] = [];

  for (let i = 0; i < coordinates.length; i += batchSize) {
    const batch = coordinates.slice(i, i + batchSize);

    const batchPromises = batch.map(async (coord) => {
      const result = await reverseGeocode(
        coord.latitude,
        coord.longitude,
        language
      );
      return {
        ...result,
        coordinates: coord,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add a small delay between batches to respect rate limits
    if (i + batchSize < coordinates.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
};

// ==================== DEFAULT EXPORT ====================

const reverseGeocodingService = {
  reverseGeocode,
  batchReverseGeocode,
};

export default reverseGeocodingService;
