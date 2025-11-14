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
        console.log("Fetching reports with tags:", tags, "and limit:", limit);
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
        const data = await response.json();
        setReports(data.reports || []);
        console.log("Reports:", data.reports);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (useTags) {
      fetchReports();
    }
  }, [tags, limit, useTags]);

  return { reports, loading, error };
};
