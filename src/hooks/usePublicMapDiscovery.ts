import { useEffect, useState } from "react";
import {
  fetchPublicDigitalBrandSummaries,
  fetchPublicPhysicalPoints,
} from "@/lib/public-discovery-api";
import {
  PublicBrandSummary,
  PublicPhysicalPoint,
} from "@/types/public-discovery";
import { getCurrentLocale } from "@/lib/i18n";

export function usePublicMapDiscovery(
  selectedTab: "physical" | "digital",
  physicalBBox: [number, number, number, number] | null,
  zoom: number,
) {
  const [physicalItems, setPhysicalItems] = useState<PublicPhysicalPoint[]>([]);
  const [digitalItems, setDigitalItems] = useState<PublicBrandSummary[]>([]);
  const [loading, setLoading] = useState({ physical: false, digital: false });
  const [error, setError] = useState({ physical: null as string | null, digital: null as string | null });

  useEffect(() => {
    let cancelled = false;
    const locale = getCurrentLocale();

    if (selectedTab === "digital") {
      setLoading((prev) => ({ ...prev, digital: true }));
      setError((prev) => ({ ...prev, digital: null }));
      fetchPublicDigitalBrandSummaries(locale)
        .then((items) => {
          if (!cancelled) {
            setDigitalItems(items);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setDigitalItems([]);
            setError((prev) => ({
              ...prev,
              digital: err instanceof Error ? err.message : "Load failed",
            }));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading((prev) => ({ ...prev, digital: false }));
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedTab]);

  useEffect(() => {
    if (selectedTab !== "physical" || !physicalBBox) {
      return;
    }

    let cancelled = false;
    setLoading((prev) => ({ ...prev, physical: true }));
    setError((prev) => ({ ...prev, physical: null }));

    fetchPublicPhysicalPoints(physicalBBox, zoom)
      .then((items) => {
        if (!cancelled) {
          setPhysicalItems(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPhysicalItems([]);
          setError((prev) => ({
            ...prev,
            physical: err instanceof Error ? err.message : "Load failed",
          }));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading((prev) => ({ ...prev, physical: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [physicalBBox, selectedTab, zoom]);

  return { physicalItems, digitalItems, loading, error };
}
