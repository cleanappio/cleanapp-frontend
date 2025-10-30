import { useEffect, useState, useCallback } from "react";
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
  appendPhysicalLite: (reports: PhysicalReportResponse[]) => void;
  appendDigitalLite: (reports: DigitalReportResponse[]) => void;
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

  const fetchAll = useCallback(async () => {
    const locale = getCurrentLocale();
    const apiUrl =
      process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";

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

      // Digital reports
      fetch(
        `${apiUrl}/api/v4/brands/summary?classification=digital&lang=${locale}`
      )
        .then((res) => res.json())
        .then((data) => {
          // const digi = filterAnalysesByLanguage(data.reports || [], locale);
          const digitalReports = data.map((report: DigitalReportResponse) => ({
            ...report,
            classification: "digital",
          }));
          setDigitalReports(digitalReports);
        })
        .catch((error) => {
          setErrors((prev) => ({ ...prev, digital: error.message }));
        })
        .finally(() => {
          setLoading((prev) => ({ ...prev, digital: false }));
        });
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
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const appendWithDedupe = (
    current: ReportResponse[],
    toAdd: ReportResponse[]
  ) => {
    const seen = new Set<string>();
    const merged = [...toAdd, ...current].filter((item) => {
      const classification = item?.classification as "physical" | "digital";
      if (classification === "physical") {
        const physicalReport = item as PhysicalReportResponse;
        const lat = physicalReport.latitude;
        const long = physicalReport.longitude;
        const severity_level = physicalReport.severity_level;
        if (seen.has(lat + "," + long + "," + severity_level)) return false;
        seen.add(lat + "," + long + "," + severity_level);
        return true;
      } else {
        const digitalReport = item as DigitalReportResponse;
        const brand_name = digitalReport.brand_name;
        if (seen.has(brand_name)) return false;
        seen.add(brand_name);
        return true;
      }
    });
    return merged;
  };

  const appendPhysicalLite = (reports: ReportResponse[]) => {
    setPhysicalReports(
      (prev) => appendWithDedupe(prev, reports) as PhysicalReportResponse[]
    );
  };

  const appendDigitalLite = (reports: ReportResponse[]) => {
    setDigitalReports(
      (prev) => appendWithDedupe(prev, reports) as DigitalReportResponse[]
    );
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
