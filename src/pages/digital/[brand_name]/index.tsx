"use client";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { useReportsByBrand } from "@/hooks/useReportsByBrand";
import { usePublicReportsByBrand } from "@/hooks/usePublicReportsByBrand";
import { getCurrentLocale } from "@/lib/i18n";
import { useRouter } from "next/router";
import PublicBrandDashboard from "@/components/brand/PublicBrandDashboard";
import { useEffect, useState } from "react";
import SubscribedBrandDashboard from "@/components/brand/SubscribedBrandDashboard";
import { useAuthStore } from "@/lib/auth-store";
import CleanIntelligencePanel from "@/components/brand/CleanIntelligencePanel";
import { EmbeddedReportBackBar } from "@/components/report/PublicReportDetailPage";
import EvidenceFilters from "@/components/evidence/EvidenceFilters";
import type { ReportKindFilter, ReportSignalSort } from "@/lib/report-evidence";

export default function DigitalBrandPage() {
  const router = useRouter();
  const brandName = typeof router.query.brand_name === "string" ? router.query.brand_name : "";
  const locale = getCurrentLocale();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const subscription = useAuthStore((state) => state.subscription);
  const isSubscribed = isAuthenticated && subscription?.status === "active";
  const [isNativeWebView, setIsNativeWebView] = useState(false);
  const isEmbedded = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true" || isNativeWebView;
  const [kind, setKind] = useState<ReportKindFilter>("firsthand");
  const [sort, setSort] = useState<ReportSignalSort>("signal");
  const [product, setProduct] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => { setIsNativeWebView(Boolean(window.ReactNativeWebView)); }, []);
  useEffect(() => { setKind("firsthand"); setSort("signal"); setProduct(""); setOffset(0); }, [brandName]);

  const publicReports = usePublicReportsByBrand(brandName, locale, Boolean(brandName), { kind, sort, product, offset });
  const paidReports = useReportsByBrand(brandName, locale, isSubscribed);
  const { items, totalCount, brandDisplayName, batch, isLoading, error, refresh, hasScopedCounts } = publicReports;
  const changeKind = (nextKind: ReportKindFilter) => { setKind(nextKind); setOffset(0); };

  return (
    <div className="min-h-screen bg-white">
      {isEmbedded ? <EmbeddedReportBackBar onBack={() => { void router.push({ pathname: "/", query: { tab: "digital" } }); }} /> : <PageHeader />}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        <p className="mb-2 text-xs text-gray-500">Digital reports{batch?.scope?.includes_products ? " · Company and product scope" : ""}</p>
        <h1 className="mb-1 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">{brandDisplayName || brandName}</h1>
        <p className="mb-5 text-sm text-gray-600">Product issues, original sources and reported impact.</p>
        <EvidenceFilters kind={kind} sort={sort} product={product} batch={batch} onKind={changeKind} onSort={(next) => { setSort(next); setOffset(0); }} onProduct={(next) => { setProduct(next); setOffset(0); }} />
        <section aria-label="Report evidence" aria-busy={isLoading}>
          {isLoading ? <p role="status" className="py-12 text-sm text-gray-600">Loading source evidence…</p> : error ? (
            <div role="alert" className="py-8"><h2 className="mb-2 text-lg font-semibold text-gray-900">Reports could not be loaded</h2><p className="mb-3 text-sm text-gray-600">The evidence service is unavailable. Try again to load this view.</p><button type="button" onClick={refresh} className="min-h-[44px] rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">Retry</button></div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500"><h2 className="text-sm font-semibold text-gray-900">{kind === "firsthand" ? "Firsthand issue entries" : kind === "coverage" ? "Coverage entries" : kind === "unknown" ? "Unclassified entries" : "All source entries"}</h2><p>{totalCount} {hasScopedCounts ? (totalCount === 1 ? "issue entry in this view" : "issue entries in this view") : "entries in the loaded sample"}</p></div>
              {!hasScopedCounts && <p className="mb-4 text-xs text-gray-500">Classification or scoped counts are not yet available for this response. Unclassified material is kept separate.</p>}
              {sort === "recent" && hasScopedCounts && <p className="mb-3 text-xs text-gray-500">Sorted by observation or publication date; missing source dates use ingestion time.</p>}
              {batch?.kind_counts && batch.kind_counts.all < batch.kind_counts.firsthand + batch.kind_counts.coverage + batch.kind_counts.unknown && <p className="mb-3 text-xs text-gray-500">Related issue families can appear in more than one source view.</p>}
              {items.length ? <PublicBrandDashboard items={items} /> : (
                <div className="border-y border-gray-100 py-8"><h3 className="mb-2 text-lg font-semibold text-gray-900">{kind === "firsthand" ? "No classified firsthand reports in this view" : "No reports in this view"}</h3><p className="max-w-xl text-sm leading-6 text-gray-600">{kind === "firsthand" ? "Firsthand includes only sources classified from original evidence. Coverage and unclassified sources remain available." : "Try another source type or product scope."}</p><div className="mt-3 flex flex-wrap gap-4"><button type="button" onClick={() => changeKind("unknown")} className="min-h-[44px] text-sm font-semibold text-green-800 underline underline-offset-4">View unclassified</button><button type="button" onClick={() => changeKind("all")} className="min-h-[44px] text-sm font-semibold text-green-800 underline underline-offset-4">View all sources</button></div></div>
              )}
              {(offset > 0 || batch?.has_more) && <nav aria-label="Report pages" className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4"><button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 12))} className="min-h-[44px] px-3 text-sm font-semibold text-green-800 disabled:text-gray-400">Previous</button><span className="text-xs text-gray-500">Entries {offset + 1}–{offset + items.length}</span><button type="button" disabled={!batch?.has_more} onClick={() => setOffset(offset + 12)} className="min-h-[44px] px-3 text-sm font-semibold text-green-800 disabled:text-gray-400">Next</button></nav>}
            </>
          )}
        </section>
        <details className="mt-8 border-t border-gray-200 pt-4"><summary className="min-h-[44px] cursor-pointer text-base font-semibold text-gray-900">Ask about the evidence</summary><p className="mb-4 text-xs text-gray-500">Answers may include all source types for this company. Check the cited original evidence.</p><CleanIntelligencePanel orgId={brandName} totalReports={batch?.kind_counts?.all ?? totalCount} /></details>
        {isSubscribed && (
          <section className="mt-8 border-t border-gray-200 pt-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Subscriber report access</h2>
            {paidReports.isLoading ? (
              <p role="status" className="text-sm text-gray-600">Loading subscriber reports…</p>
            ) : paidReports.error ? (
              <p role="alert" className="text-sm text-red-700">Subscriber reports could not be loaded.</p>
            ) : (
              <>
                {paidReports.hasMore && <p className="mb-3 text-xs text-gray-500">Showing the latest {paidReports.brandReports.length} subscriber entries; this list displays up to 100.</p>}
                <SubscribedBrandDashboard brandReports={paidReports.brandReports} />
              </>
            )}
          </section>
        )}
      </div>
      {!isEmbedded && <Footer />}
    </div>
  );
}
