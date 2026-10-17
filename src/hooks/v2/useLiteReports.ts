import { useEffect, useState, useCallback, useRef } from "react";
import { getCurrentLocale } from "@/lib/i18n";
import { PhysicalReportResponse } from "@/types/reports/api/physical";
import { DigitalReportResponse } from "@/types/reports/api/digital";
import { ReportResponse } from "@/types/reports/api";

export interface UseLiteReportsByTabReturn {
  physicalReports: PhysicalReportResponse[];
  digitalReports: DigitalReportResponse[];
  loading: { physical: boolean; digital: boolean };
  errors: { physical: string | null; digital: string | null };
  refetch: () => Promise<void>;
  invalidateDigital: () => void;
  appendPhysicalLite: (reports: PhysicalReportResponse[]) => void;
  appendDigitalLite: (reports: DigitalReportResponse[]) => void;
}

function getRendererApiUrl() {
  return process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true" &&
    typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_RENDERER_API_URL || "http://localhost:8080";
}

function appendWithDedupe(current: ReportResponse[], toAdd: ReportResponse[]) {
  const seen = new Set<string>();
  return [...toAdd, ...current].filter((item) => {
    const classification = item?.classification as "physical" | "digital";
    const key = classification === "physical"
      ? `${(item as PhysicalReportResponse).latitude},${(item as PhysicalReportResponse).longitude},${(item as PhysicalReportResponse).severity_level}`
      : (item as DigitalReportResponse).brand_name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fetches lite reports for both classifications and maintains separate arrays.
 * Digital uses full_data=true, Physical uses full_data=false.
 */
export function useLiteReportsByTabV2(): UseLiteReportsByTabReturn {
  const [physicalReports, setPhysicalReports] = useState<
    PhysicalReportResponse[]
  >([]);
  const [digitalReports, setDigitalReports] = useState<DigitalReportResponse[]>(
    []
  );
  const [loading, setLoading] = useState({ physical: true, digital: true });
  const [errors, setErrors] = useState({
    physical: null as string | null,
    digital: null as string | null,
  });
  const digitalInvalidator = useRef<(() => void) | null>(null);
  const invalidateDigital = useCallback(() => digitalInvalidator.current?.(), []);

  useEffect(() => {
    // This is the whole map index, not a small live-report batch. Coalesce
    // invalidations and leave at least a minute between multi-megabyte loads.
    const minRefreshGap = 60_000;
    let stopped = false;
    let inFlight = false;
    let dirty = false;
    let lastStarted = -Infinity;
    let scheduled: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    function refresh() {
      if (stopped) return;
      dirty = true;
      if (document.visibilityState === "hidden" || inFlight) return;
      const delay = Math.max(0, minRefreshGap - (Date.now() - lastStarted));
      if (delay > 0) {
        scheduled ??= setTimeout(() => {
          scheduled = undefined;
          refresh();
        }, delay);
        return;
      }
      if (scheduled !== undefined) clearTimeout(scheduled);
      scheduled = undefined;
      void request();
    }

    async function request() {
      const abort = new AbortController();
      controller = abort;
      inFlight = true;
      dirty = false;
      lastStarted = Date.now();
      setLoading((prev) => ({ ...prev, digital: true }));
      setErrors((prev) => ({ ...prev, digital: null }));
      try {
        const timeout = new Promise<never>((_, reject) => {
          deadline = setTimeout(() => {
            reject(new Error("Brand summaries refresh timed out."));
            abort.abort();
          }, 15_000);
        });
        const data = await Promise.race([
          fetch(`${getRendererApiUrl()}/api/v4/brands/summary?classification=digital&lang=${getCurrentLocale()}`, { signal: abort.signal })
            .then(async (response) => {
              if (!response.ok) throw new Error(`Brand summaries request failed: ${response.status}`);
              return response.json();
            }),
          timeout,
        ]);
        if (!Array.isArray(data)) throw new Error("Invalid brand summaries response");
        if (stopped) return;
        setDigitalReports(data.map((report: DigitalReportResponse) => ({
          ...report,
          classification: "digital",
        })));
      } catch (error) {
        if (stopped) return;
        // Preserve the last complete count snapshot through refresh failures.
        setErrors((prev) => ({ ...prev, digital: error instanceof Error ? error.message : "Load failed" }));
      } finally {
        if (deadline !== undefined) clearTimeout(deadline);
        deadline = undefined;
        controller = undefined;
        inFlight = false;
        if (!stopped) {
          setLoading((prev) => ({ ...prev, digital: false }));
          if (dirty) refresh();
        }
      }
    }

    digitalInvalidator.current = refresh;
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      digitalInvalidator.current = null;
      controller?.abort();
      if (scheduled !== undefined) clearTimeout(scheduled);
      if (deadline !== undefined) clearTimeout(deadline);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const fetchAll = useCallback(async () => {
    const apiUrl = getRendererApiUrl();

    setLoading({ physical: true, digital: true });
    setErrors({ physical: null, digital: null });

    try {
      // Physical reports
      fetch(`${apiUrl}/api/v4/reports/points?classification=physical`)
        .then((res) => res.json())
        .then((data) => {
          // const phys = filterAnalysesByLanguage(data.reports || [], locale);
          // append field classification: "physical" to each report
          const physicalReports = data.map(
            (report: PhysicalReportResponse) => ({
              ...report,
              classification: "physical",
            })
          );
          setPhysicalReports(physicalReports);
        })
        .catch((error) => {
          setErrors((prev) => ({ ...prev, physical: error.message }));
        })
        .finally(() => {
          setLoading((prev) => ({ ...prev, physical: false }));
        });

      invalidateDigital();
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
    }
  }, [invalidateDigital]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const appendPhysicalLite = useCallback((reports: PhysicalReportResponse[]) => {
    setPhysicalReports(
      (prev) => appendWithDedupe(prev, reports) as PhysicalReportResponse[]
    );
  }, []);

  const appendDigitalLite = useCallback((reports: DigitalReportResponse[]) => {
    setDigitalReports(
      (prev) => appendWithDedupe(prev, reports) as DigitalReportResponse[]
    );
  }, []);

  return {
    physicalReports,
    digitalReports,
    loading,
    errors,
    refetch: fetchAll,
    invalidateDigital,
    appendPhysicalLite,
    appendDigitalLite,
  };
}
