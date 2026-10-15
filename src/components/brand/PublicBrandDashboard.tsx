"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { resolvePublicDiscoveryToken } from "@/lib/public-discovery-api";
import { PublicDiscoveryCard, PublicDiscoveryResolveResponse } from "@/types/public-discovery";
import ReportEvidence from "@/components/evidence/ReportEvidence";
import { getCurrentLocale } from "@/lib/i18n";

type Props = {
  items: PublicDiscoveryCard[];
  onOpenReport?: (resolved: PublicDiscoveryResolveResponse) => void;
};

export default function PublicBrandDashboard({ items, onOpenReport }: Props) {
  const router = useRouter();
  const locale = getCurrentLocale();
  const [openError, setOpenError] = useState(false);
  const [openingToken, setOpeningToken] = useState<string | null>(null);
  const resolveGeneration = useRef(0);
  useEffect(() => () => { resolveGeneration.current += 1; }, []);

  const handleOpen = async (item: PublicDiscoveryCard) => {
    const generation = ++resolveGeneration.current;
    setOpenError(false);
    setOpeningToken(item.discovery_token);
    try {
      const resolved = await resolvePublicDiscoveryToken(item.discovery_token);
      if (generation !== resolveGeneration.current) return;
      if (onOpenReport) onOpenReport(resolved);
      else if (resolved.canonical_path) await router.push(resolved.canonical_path);
      else setOpenError(true);
    } catch {
      if (generation === resolveGeneration.current) setOpenError(true);
    } finally {
      if (generation === resolveGeneration.current) setOpeningToken(null);
    }
  };

  return (
    <div>
      {openError && <p role="alert" className="mb-4 text-red-700">Unable to open this report. Please try again.</p>}
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <article key={item.discovery_token} className="py-6 first:pt-2" aria-label={item.title || "Report"}>
            <p className="mb-2 text-xs font-semibold text-green-800">{item.brand_display_name || item.brand_name || (item.classification === "physical" ? "Location observation" : "Product issue")}{item.recurrence?.grouping === "related_issue_family" ? " · Related issue family" : ""}</p>
            <h3 className="mb-3 max-w-3xl break-words text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{item.title || "Untitled report"}</h3>
            <ReportEvidence evidence={item.evidence} recurrence={item.recurrence} summary={item.summary} locale={locale} />
            <button type="button" disabled={openingToken === item.discovery_token} onClick={() => { void handleOpen(item); }} className="mt-3 inline-flex min-h-[44px] items-center rounded-md border border-green-200 px-4 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-60">
              {openingToken === item.discovery_token ? "Opening report…" : "View report details"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
