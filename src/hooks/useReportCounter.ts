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
      if (showLoading) setIsLoading(true);
      const response = await fetch("/api/reports-count");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setReportCounter(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch report counter:", err);
      // Keep existing data on error if polling, otherwise show error
      if (showLoading) {
        setError("Failed to load report data");
      }
    } finally {
      if (showLoading) setIsLoading(false);
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
