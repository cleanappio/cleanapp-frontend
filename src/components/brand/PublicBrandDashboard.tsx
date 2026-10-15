"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { resolvePublicDiscoveryToken } from "@/lib/public-discovery-api";
import { PublicDiscoveryCard, PublicDiscoveryResolveResponse } from "@/types/public-discovery";
import BrandReportEvidence from "@/components/brand/BrandReportEvidence";
import ReportThumbnail from "@/components/report/ReportThumbnail";
import { getCurrentLocale } from "@/lib/i18n";
import { rowProductLabel } from "@/lib/brand-report-presentation";
import type { ReportKindFilter } from "@/lib/report-evidence";

type Props = {
  items: PublicDiscoveryCard[];
  onOpenReport?: (resolved: PublicDiscoveryResolveResponse) => void;
  pageBrand?: string;
  activeKind?: ReportKindFilter;
};

export default function PublicBrandDashboard({ items, onOpenReport, pageBrand, activeKind }: Props) {
  const router = useRouter();
  const locale = getCurrentLocale();
  const contextBrand = pageBrand || (typeof router.query.brand_name === "string" ? router.query.brand_name : undefined);
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
      <div className="-mx-4 divide-y divide-gray-100 sm:-mx-5">
        {items.map((item) => (
          <article key={item.discovery_token} className="flow-root px-4 py-7 odd:bg-white even:bg-green-50/50 sm:px-5 sm:py-8" aria-label={item.title || "Report"}>
            <ReportThumbnail item={item} onOpen={() => { void handleOpen(item); }} className="float-right mb-3 ml-4 w-24 sm:ml-6 sm:w-40" />
            <h3 className="mb-2 flow-root break-words text-xl font-semibold leading-snug tracking-tight text-gray-950 sm:text-2xl">
              <button type="button" disabled={openingToken === item.discovery_token} aria-busy={openingToken === item.discovery_token} onClick={() => { void handleOpen(item); }} className="min-h-[44px] w-full text-left transition-colors hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700 disabled:opacity-60 [overflow-wrap:anywhere]">
                {item.title || "Untitled report"}
              </button>
            </h3>
            <BrandReportEvidence item={item} productLabel={rowProductLabel(item, contextBrand)} locale={locale} showSourceKind={!activeKind || activeKind === "all"}
              action={<button type="button" disabled={openingToken === item.discovery_token} onClick={() => { void handleOpen(item); }} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-green-800 transition-colors hover:text-green-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-60">
                {openingToken === item.discovery_token ? "Opening…" : <>Read report <span aria-hidden="true" className="ml-1">→</span></>}
              </button>}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
