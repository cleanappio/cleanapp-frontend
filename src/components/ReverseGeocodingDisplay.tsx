import React from "react";

interface ReverseGeocodingDisplayProps {
  address: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  className?: string;
  textClassName?: string;
}

/**
 * Reusable component for displaying reverse geocoding results
 * Handles loading, error, and success states with retry functionality
 */
export const ReverseGeocodingDisplay: React.FC<
  ReverseGeocodingDisplayProps
> = ({
  address,
  loading,
  error,
  onRetry,
  className = "",
  textClassName = "text-sm",
}) => {
    return (
      <div
        className={`flex flex-row items-center justify-between gap-1 ${className}`}
      >
        <div className="flex-1">
          {loading ? (
            <div className="flex flex-row items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 italic">Getting address...</p>
            </div>
          ) : error ? (
            <div className="flex flex-row items-center gap-2 flex-wrap">
              <p className="text-red-400 text-xs flex-1">{error}</p>
              <button
                onClick={onRetry}
                className="px-2 py-1 bg-blue-500/30 rounded border border-blue-500 cursor-pointer hover:bg-blue-500/40 transition-colors"
              >
                <p className="text-blue-500 text-xs font-semibold">Retry</p>
              </button>
            </div>
          ) : address && address !== "0" ? (
            <p className={textClassName}>{address}</p>
          ) : (
            <p className={textClassName}>--</p>
          )}
        </div>
      </div>
    );
  };

export default ReverseGeocodingDisplay;
