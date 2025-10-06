import { useEffect, useState, useCallback } from "react";
import { ReportWithAnalysis } from "@/components/GlobeView";
import { getCurrentLocale, filterAnalysesByLanguage } from "@/lib/i18n";

export type Classification = "physical" | "digital";

interface UseLiteReportsOptions {
  n?: number;
}

interface UseLiteReportsReturn {
  reports: ReportWithAnalysis[];
  loading: boolean;
  error: string | null;
  refetch: (classification: Classification) => Promise<void>;
}

/**
 * Fetches lite/full reports for the map layer with a large limit.
 * For digital classification, requests full_data=true; otherwise full_data=false.
 */
export function useLiteReports(
  classification: Classification,
  options: UseLiteReportsOptions = {}
): UseLiteReportsReturn {
  const { n = 100000 } = options;
  const [reports, setReports] = useState<ReportWithAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (c: Classification) => {
      setLoading(true);
      setError(null);
      try {
        const locale = getCurrentLocale();
        const apiUrl =
          process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
        const fullData = c === "digital" ? "true" : "false";
        const response = await fetch(
          `${apiUrl}/api/v3/reports/last?n=${n}&lang=${locale}&full_data=${fullData}&classification=${c}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${c} lite reports: ${response.status}`
          );
        }
        const data = await response.json();
        const filtered = filterAnalysesByLanguage(data.reports || [], locale);
        setReports(filtered);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        // On error keep previous reports
      } finally {
        setLoading(false);
      }
    },
    [n]
  );

  useEffect(() => {
    fetchReports(classification);
  }, [classification, fetchReports]);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
  };
}

interface UseLiteReportsByTabReturn {
  physicalReports: ReportWithAnalysis[];
  digitalReports: ReportWithAnalysis[];
  loading: { physical: boolean; digital: boolean };
  errors: { physical: string | null; digital: string | null };
  refetch: () => Promise<void>;
  appendPhysicalLite: (reports: ReportWithAnalysis[]) => void;
  appendDigitalLite: (reports: ReportWithAnalysis[]) => void;
}

/**
 * Fetches lite reports for both classifications and maintains separate arrays.
 * Digital uses full_data=true, Physical uses full_data=false.
 */
export function useLiteReportsByTab(
  options: UseLiteReportsOptions = {}
): UseLiteReportsByTabReturn {
  const { n = 100000 } = options;
  const [physicalReports, setPhysicalReports] = useState<ReportWithAnalysis[]>(
    []
  );
  const [digitalReports, setDigitalReports] = useState<ReportWithAnalysis[]>(
    []
  );
  const [loading, setLoading] = useState({ physical: true, digital: true });
  const [errors, setErrors] = useState({
    physical: null as string | null,
    digital: null as string | null,
  });

  const fetchAll = useCallback(async () => {
    const locale = getCurrentLocale();
    const apiUrl =
      process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";

    setLoading({ physical: true, digital: true });
    setErrors({ physical: null, digital: null });

    try {
      const [physRes, digiRes] = await Promise.all([
        fetch(
          `${apiUrl}/api/v3/reports/last?n=${n}&lang=${locale}&full_data=false&classification=physical`
        ),
        fetch(
          `${apiUrl}/api/v3/reports/last?n=${n}&lang=${locale}&full_data=true&classification=digital`
        ),
      ]);

      if (!physRes.ok)
        throw new Error(`Failed physical lite: ${physRes.status}`);
      if (!digiRes.ok)
        throw new Error(`Failed digital full: ${digiRes.status}`);

      const [physJson, digiJson] = await Promise.all([
        physRes.json(),
        digiRes.json(),
      ]);
      const phys = filterAnalysesByLanguage(physJson.reports || [], locale);
      const digi = filterAnalysesByLanguage(digiJson.reports || [], locale);
      setPhysicalReports(phys);
      setDigitalReports(digi);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      // Don't clear arrays on error; just set generic error
      if (msg.includes("physical"))
        setErrors((prev) => ({ ...prev, physical: msg }));
      if (msg.includes("digital"))
        setErrors((prev) => ({ ...prev, digital: msg }));
      if (!msg.includes("physical") && !msg.includes("digital")) {
        setErrors({ physical: msg, digital: msg });
      }
    } finally {
      setLoading({ physical: false, digital: false });
    }
  }, [n]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  const appendPhysicalLite = (reports: ReportWithAnalysis[]) => {
    setPhysicalReports((prev) => appendWithDedupe(prev, reports));
  };

  const appendDigitalLite = (reports: ReportWithAnalysis[]) => {
    setDigitalReports((prev) => appendWithDedupe(prev, reports));
  };

  return {
    physicalReports,
    digitalReports,
    loading,
    errors,
    refetch: fetchAll,
    appendPhysicalLite,
    appendDigitalLite,
  };
}
