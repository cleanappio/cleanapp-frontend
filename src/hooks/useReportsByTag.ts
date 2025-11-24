import { ReportWithAnalysis } from "@/components/GlobeView";
import { useState } from "react";

import { useEffect } from "react";

export const useReportsByTags = (
  tags: string[],
  limit: number = 100,
  useTags: boolean = false
) => {
  const [reports, setReports] = useState<ReportWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_TAGS_API_URL
          }/api/v3/feed/tags?limit=${limit}&tags=${tags.join(",")}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch reports: ${response.status} ${response.statusText} ${response.body}`
          );
        }

        const requests = tags.map((tag) =>
          fetch(
            `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v4/reports/by-brand?brand_name=${tag}&n=10`
          )
            .then(async (response) => {
              if (response.ok) {
                const data = await response.json();
                return { tag, success: true, reports: data.reports || [] };
              } else {
                console.error(
                  `Failed to fetch digital reports for ${tag}:`,
                  response.status
                );
                return {
                  tag,
                  success: false,
                  reports: [],
                  error: `HTTP ${response.status}`,
                };
              }
            })
            .catch((error) => {
              console.error(
                `Error fetching digital reports for ${tag}:`,
                error
              );
              return {
                tag,
                success: false,
                reports: [],
                error: error instanceof Error ? error.message : "Unknown error",
              };
            })
        );

        const results = await Promise.allSettled(requests);
        const allReports: ReportWithAnalysis[] = [];
        const errors: string[] = [];

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const { tag, success, reports, error } = result.value;
            if (success && Array.isArray(reports)) {
              allReports.push(...reports);
            } else if (error) {
              errors.push(`Failed to fetch reports for ${tag}: ${error}`);
            }
          } else {
            console.error(`Promise rejected for brand request:`, result.reason);
            errors.push(
              `Error: ${
                result.reason instanceof Error
                  ? result.reason.message
                  : "Unknown error"
              }`
            );
          }
        });

        const data = await response.json();

        // Create a combined array of reports and allReports and remove duplicates
        const combinedReports = [
          ...(data.reports as ReportWithAnalysis[]),
          ...allReports,
        ].filter(
          (report, index, self) =>
            index ===
            self.findIndex((t) => t.report?.seq === report.report?.seq)
        );

        setReports(combinedReports);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (!useTags) {
      setLoading(false);
      return;
    }

    fetchReports();
  }, [tags, limit, useTags]);

  return { reports, loading, error };
};
