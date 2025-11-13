import { useEffect, useState } from "react";
import { ReportWithAnalysis } from "@/components/GlobeView";

export const useBackendSearch = (classification: "digital" | "physical") => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ReportWithAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!debouncedQuery) {
      setSearchResults([]);
      return;
    }

    const search = async (
      term: string,
      classification: "digital" | "physical"
    ) => {
      try {
        setLoading(true);
        setError(null);
        setSearchTerm(term);
        console.log("Searching for:", term);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/search?q=${term}&classification=${classification}`
        );
        if (!response.ok) {
          throw new Error(`Failed to search: ${response.status}`);
        }
        console.log("Search response:", response);
        const data = await response.json();
        console.log("Search data:", data);
        setSearchResults(data.reports);
      } catch (error) {
        console.log("Error searching:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    search(debouncedQuery, classification);
  }, [debouncedQuery, classification]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    loading,
    error,
  };
};
