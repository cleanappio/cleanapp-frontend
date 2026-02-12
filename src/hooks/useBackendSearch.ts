import { useEffect, useRef, useState } from "react";
import { ReportWithAnalysis } from "@/components/GlobeView";

export const useBackendSearch = (classification: "digital" | "physical") => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ReportWithAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  const [debouncedQuery, setDebouncedQuery] = useState(searchTerm);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 500); // wait 500ms after last keystroke

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch when debouncedQuery changes
  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++latestRequestIdRef.current;
    const apiUrl =
      process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";

    const search = async (term: string, cls: "digital" | "physical") => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${apiUrl}/api/v3/reports/search?q=${encodeURIComponent(term)}&classification=${cls}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to search: ${response.status}`);
        }
        const data = await response.json();
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        setSearchResults(data.reports || []);
      } catch (error) {
        if (controller.signal.aborted || latestRequestIdRef.current !== requestId) {
          return;
        }
        setSearchResults([]);
        setError(error instanceof Error ? error.message : "Load failed");
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    search(trimmedQuery, classification);

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, classification]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    loading,
    error,
  };
};
