import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { ReportWithAnalysis } from "@/components/GlobeView";
import { ReportFilteringService } from "@/services/reportFilteringService";
import { getCurrentLocale } from "@/lib/i18n";

export type ReportTab = "physical" | "digital";

export interface UseReportTabsReturn {
  selectedTab: ReportTab;
  setSelectedTab: (tab: ReportTab) => void;
  isPhysical: boolean;
  isDigital: boolean;
  filteredReports: ReportWithAnalysis[];
  physicalReports: ReportWithAnalysis[];
  digitalReports: ReportWithAnalysis[];
  reportStats: {
    total: number;
    physical: number;
    digital: number;
  };
  // Loading states
  loading: {
    physical: boolean;
    digital: boolean;
    current: boolean;
  };
  // Error states
  errors: {
    physical: string | null;
    digital: string | null;
  };
  // API methods
  fetchPhysicalReports: (n?: number) => Promise<void>;
  fetchDigitalReports: (n?: number) => Promise<void>;
  fetchCurrentTabReports: (n?: number) => Promise<void>;
  // Append helpers for websocket updates
  appendPhysicalFull: (reports: ReportWithAnalysis[]) => void;
  appendDigitalFull: (reports: ReportWithAnalysis[]) => void;
  // State management
  setPhysicalReports: (reports: ReportWithAnalysis[]) => void;
  setDigitalReports: (reports: ReportWithAnalysis[]) => void;
  clearPhysicalReports: () => void;
  clearDigitalReports: () => void;
  clearAllReports: () => void;
  clearErrors: () => void;
}

/**
 * Custom hook to manage Physical vs Digital report tab logic
 * Handles API calls, state management, and loading states
 * Maintains separate state for physical and digital reports
 * Syncs tab state with URL query parameter (?tab=physical or ?tab=digital)
 */
export function useReportTabs(): UseReportTabsReturn {
  const router = useRouter();

  // Initialize selectedTab from router query parameter
  const getTabFromQuery = useCallback((): ReportTab => {
    // Only read from query when router is ready, otherwise default to physical
    if (!router.isReady) {
      return "physical";
    }
    const tab = router.query.tab;
    if (tab === "digital") {
      return "digital";
    }
    // Default to "physical" if query param is missing or invalid
    return "physical";
  }, [router.query.tab, router.isReady]);

  const [selectedTab, setSelectedTabState] = useState<ReportTab>("physical");

  // Sync state with URL when query parameter changes (e.g., browser back/forward, direct navigation)
  useEffect(() => {
    if (router.isReady) {
      const tabFromQuery = getTabFromQuery();
      if (selectedTab !== tabFromQuery) {
        setSelectedTabState(tabFromQuery);
      }
    }
    // Only depend on router.query.tab and router.isReady to avoid unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.tab, router.isReady]);

  // Wrapper for setSelectedTab that updates URL with shallow routing
  const setSelectedTab = useCallback(
    (tab: ReportTab) => {
      setSelectedTabState(tab);
      // Use shallow routing to update query parameter without page reload
      router.push({ pathname: "/", query: { tab } }, undefined, {
        shallow: true,
      });
    },
    [router]
  );

  // Separate state for physical and digital reports
  const [physicalReports, setPhysicalReports] = useState<ReportWithAnalysis[]>(
    []
  );
  const [digitalReports, setDigitalReports] = useState<ReportWithAnalysis[]>(
    []
  );

  // Loading states
  const [loading, setLoading] = useState({
    physical: false,
    digital: false,
    current: false,
  });

  // Error states
  const [errors, setErrors] = useState({
    physical: null as string | null,
    digital: null as string | null,
  });

  // Computed values
  const isPhysical = selectedTab === "physical";
  const isDigital = selectedTab === "digital";

  // Get reports for currently selected tab
  const filteredReports = useMemo(() => {
    return selectedTab === "physical" ? physicalReports : digitalReports;
  }, [selectedTab, physicalReports, digitalReports]);

  // Get report statistics from both states
  const reportStats = useMemo(() => {
    const allReports = [...physicalReports, ...digitalReports];
    return ReportFilteringService.getReportStats(allReports);
  }, [physicalReports, digitalReports]);

  // API call helper
  const fetchReports = useCallback(
    async (
      classification: "physical" | "digital",
      n: number = 10
    ): Promise<ReportWithAnalysis[]> => {
      const locale = getCurrentLocale();
      const apiUrl =
        process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";

      // For digital we need full_data to be true (brand projection etc.),
      // for physical we can use lite data to reduce payload size
      const fullData = classification === "digital" ? "true" : "false";

      const response = await fetch(
        `${apiUrl}/api/v3/reports/last?n=${n}&lang=${locale}&full_data=${fullData}&classification=${classification}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${classification} reports: ${response.status}`
        );
      }

      const data = await response.json();
      return data.reports || [];
    },
    []
  );

  // Fetch physical reports
  const fetchPhysicalReports = useCallback(
    async (n: number = 10) => {
      setLoading((prev) => ({ ...prev, physical: true }));
      setErrors((prev) => ({ ...prev, physical: null }));

      try {
        const reports = await fetchReports("physical", n);
        setPhysicalReports(reports);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch physical reports";
        setErrors((prev) => ({ ...prev, physical: errorMessage }));
        console.error("Error fetching physical reports:", error);
      } finally {
        setLoading((prev) => ({ ...prev, physical: false }));
      }
    },
    [fetchReports]
  );

  // Fetch digital reports
  const fetchDigitalReports = useCallback(
    async (n: number = 10) => {
      setLoading((prev) => ({ ...prev, digital: true }));
      setErrors((prev) => ({ ...prev, digital: null }));

      try {
        const reports = await fetchReports("digital", n);
        setDigitalReports(reports);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch digital reports";
        setErrors((prev) => ({ ...prev, digital: errorMessage }));
        console.error("Error fetching digital reports:", error);
      } finally {
        setLoading((prev) => ({ ...prev, digital: false }));
      }
    },
    [fetchReports]
  );

  // Fetch reports for current tab
  const fetchCurrentTabReports = useCallback(
    async (n: number = 10) => {
      setLoading((prev) => ({ ...prev, current: true }));

      try {
        if (selectedTab === "physical") {
          await fetchPhysicalReports(n);
        } else {
          await fetchDigitalReports(n);
        }
      } finally {
        setLoading((prev) => ({ ...prev, current: false }));
      }
    },
    [selectedTab, fetchPhysicalReports, fetchDigitalReports]
  );

  // Helper functions for state management
  const clearPhysicalReports = useCallback(() => {
    setPhysicalReports([]);
    setErrors((prev) => ({ ...prev, physical: null }));
  }, []);

  const clearDigitalReports = useCallback(() => {
    setDigitalReports([]);
    setErrors((prev) => ({ ...prev, digital: null }));
  }, []);

  const clearAllReports = useCallback(() => {
    setPhysicalReports([]);
    setDigitalReports([]);
    setErrors({ physical: null, digital: null });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({ physical: null, digital: null });
  }, []);

  const appendWithDedupe = (
    current: ReportWithAnalysis[],
    toAdd: ReportWithAnalysis[]
  ) => {
    const seen = new Set<number>();
    const merged = [...toAdd, ...current].filter((item) => {
      const seq = item?.report?.seq as number;
      if (seen.has(seq)) return false;
      seen.add(seq);
      return true;
    });
    return merged;
  };

  const appendPhysicalFull = useCallback((reports: ReportWithAnalysis[]) => {
    setPhysicalReports((prev) => appendWithDedupe(prev, reports));
  }, []);

  const appendDigitalFull = useCallback((reports: ReportWithAnalysis[]) => {
    setDigitalReports((prev) => appendWithDedupe(prev, reports));
  }, []);

  return {
    selectedTab,
    setSelectedTab,
    isPhysical,
    isDigital,
    filteredReports,
    physicalReports,
    digitalReports,
    reportStats,
    loading,
    errors,
    fetchPhysicalReports,
    fetchDigitalReports,
    fetchCurrentTabReports,
    appendPhysicalFull,
    appendDigitalFull,
    setPhysicalReports,
    setDigitalReports,
    clearPhysicalReports,
    clearDigitalReports,
    clearAllReports,
    clearErrors,
  };
}
