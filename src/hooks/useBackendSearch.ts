import { useEffect, useRef, useState } from "react";
import { PlaceSearchResult, PlaceSearchResponse } from "@/lib/place-search";
import { searchPublicReports } from "@/lib/public-discovery-api";
import { PublicDiscoveryCard } from "@/types/public-discovery";
import { getCurrentLocale } from "@/lib/i18n";

export const useBackendSearch = (classification: "digital" | "physical") => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PublicDiscoveryCard[]>([]);
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
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
      setPlaceResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++latestRequestIdRef.current;
    const locale = getCurrentLocale();

    const search = async (term: string, cls: "digital" | "physical") => {
      try {
        setLoading(true);
        setError(null);

        const requests: Promise<unknown>[] = [
          searchPublicReports(term, cls, locale, 12),
        ];

        if (cls === "physical") {
          requests.push(
            fetch(`/api/osm-search?query=${encodeURIComponent(term)}`, {
              signal: controller.signal,
              cache: "no-store",
            })
          );
        }

        const [reportsResponse, placesResponse] = await Promise.allSettled(requests);
        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        let reportsLoaded = false;
        let placesLoaded = cls !== "physical";
        let firstError: string | null = null;

        if (reportsResponse.status === "fulfilled") {
          const data = reportsResponse.value as { items?: PublicDiscoveryCard[] };
          setSearchResults(data.items || []);
          reportsLoaded = true;
        } else {
          firstError = reportsResponse.reason instanceof Error ? reportsResponse.reason.message : "Load failed";
          setSearchResults([]);
        }

        if (cls === "physical") {
          const placesSettled = placesResponse as
            | PromiseSettledResult<Response>
            | undefined;
          if (placesSettled && placesSettled.status === "fulfilled") {
            if (placesSettled.value.ok) {
              const placesData = (await placesSettled.value.json()) as PlaceSearchResponse;
              setPlaceResults(placesData.places || []);
              placesLoaded = true;
            } else if (!firstError) {
              firstError = `Failed to search places: ${placesSettled.value.status}`;
              setPlaceResults([]);
            }
          } else {
            if (!firstError) {
              firstError =
                placesSettled && placesSettled.status === "rejected" && placesSettled.reason instanceof Error
                  ? placesSettled.reason.message
                  : "Failed to search places";
            }
            setPlaceResults([]);
          }
        } else {
          setPlaceResults([]);
        }

        if (!reportsLoaded && !placesLoaded && firstError) {
          throw new Error(firstError);
        }
        setError(null);
      } catch (error) {
        if (controller.signal.aborted || latestRequestIdRef.current !== requestId) {
          return;
        }
        setSearchResults([]);
        setPlaceResults([]);
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
    placeResults,
    loading,
    error,
  };
};
