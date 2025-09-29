import { useState, useEffect, useCallback, useRef } from "react";

interface ReportCounterData {
  total_reports: number;
  total_physical_reports: number;
  total_digital_reports: number;
}

interface UseReportCounterReturn {
  reportCounter: ReportCounterData;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
}

const useReportCounter = (): UseReportCounterReturn => {
  const [reportCounter, setReportCounter] = useState<ReportCounterData>({
    total_reports: 0,
    total_physical_reports: 0,
    total_digital_reports: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const POLLING_INTERVAL = 30000; // 30 seconds

  const fetchReportCounter = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/reports-count`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      // Check if request was successful
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Validate response structure
      if (typeof data.total_reports !== "number") {
        throw new Error("Invalid response format from API");
      }

      setReportCounter({
        total_reports: data.total_reports,
        total_physical_reports: data.total_physical_reports,
        total_digital_reports: data.total_digital_reports,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch report counts";
      setError(errorMessage);
      console.error("useReportCounter error:", errorMessage);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Polling control functions
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    intervalRef.current = setInterval(() => {
      fetchReportCounter(false); // Don't show loading spinner for polling
    }, POLLING_INTERVAL);
  }, [fetchReportCounter]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchReportCounter();

    // Start polling automatically
    startPolling();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [fetchReportCounter, startPolling, cleanup]);

  return {
    reportCounter,
    isLoading,
    error,
    refetch: fetchReportCounter,
    isPolling,
    startPolling,
    stopPolling,
  };
};

export default useReportCounter;
