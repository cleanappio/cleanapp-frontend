import { useState, useEffect, useCallback } from "react";

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
}

const useReportCounter = (): UseReportCounterReturn => {
  const [reportCounter, setReportCounter] = useState<ReportCounterData>({
    total_reports: 0,
    total_physical_reports: 0,
    total_digital_reports: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportCounter = useCallback(async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      await fetchReportCounter();
    };

    fetchData();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [fetchReportCounter]);

  return {
    reportCounter,
    isLoading,
    error,
    refetch: fetchReportCounter,
  };
};

export default useReportCounter;
