import { NextApiRequest, NextApiResponse } from "next";

interface GeocodeRequest extends NextApiRequest {
  query: {
    lat: string;
    lng: string;
    language?: string;
  };
}

interface GeocodeResponse {
  success: boolean;
  address?: string;
  error?: string;
}

export default async function handler(
  req: GeocodeRequest,
  res: NextApiResponse<GeocodeResponse>
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { lat, lng, language = "en" } = req.query;

  // Validate required parameters
  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: "Latitude and longitude are required",
    });
  }

  // Validate coordinate values
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      success: false,
      error: "Invalid latitude or longitude values",
    });
  }

  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      error: "Invalid latitude value. Must be between -90 and 90",
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      error: "Invalid longitude value. Must be between -180 and 180",
    });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "Geocoding API key is not configured",
    });
  }

  try {
    // Construct the Google Maps API URL
    const baseUrl = "https://maps.googleapis.com/maps/api/geocode/json";
    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key: apiKey,
      language: language,
    });

    const url = `${baseUrl}?${params.toString()}`;

    // Make the API request from the server
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Handle API response status codes
    switch (data.status) {
      case "OK":
        // Success - extract the formatted address
        if (data.results && data.results.length > 0) {
          return res.status(200).json({
            success: true,
            address: data.results[0].formatted_address,
          });
        } else {
          return res.status(404).json({
            success: false,
            error: "No results found for the given coordinates",
          });
        }

      case "ZERO_RESULTS":
        return res.status(404).json({
          success: false,
          error: "No address found for the given coordinates",
        });

      case "OVER_QUERY_LIMIT":
        return res.status(429).json({
          success: false,
          error: "API quota exceeded. Please try again later",
        });

      case "REQUEST_DENIED":
        return res.status(403).json({
          success: false,
          error: "Request denied. Check your API key configuration",
        });

      case "INVALID_REQUEST":
        return res.status(400).json({
          success: false,
          error: "Invalid request parameters",
        });

      case "UNKNOWN_ERROR":
        return res.status(500).json({
          success: false,
          error: "Server error occurred. Please try again",
        });

      default:
        return res.status(500).json({
          success: false,
          error: `Unknown API status: ${data.status}`,
        });
    }
  } catch (error) {
    console.error("Geocoding API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return res.status(500).json({
      success: false,
      error: `Server error: ${errorMessage}`,
    });
  }
}
