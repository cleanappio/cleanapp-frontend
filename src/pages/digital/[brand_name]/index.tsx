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
import BrandOverview from "@/components/brand/BrandOverview";
import type { ReportKindFilter, ReportSignalSort } from "@/lib/report-evidence";
import Seo from "@/components/Seo";
import { getBrandSeoProps, type BrandSeoProps } from "@/lib/brand-seo";

export const getServerSideProps = getBrandSeoProps;

export default function DigitalBrandPage({ seo, initialPreview }: BrandSeoProps) {
  const router = useRouter();
  const brandName = typeof router.query.brand_name === "string" ? router.query.brand_name : "";
  const locale = getCurrentLocale();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const subscription = useAuthStore((state) => state.subscription);
  const isSubscribed = isAuthenticated && subscription?.status === "active";
  const [isNativeWebView, setIsNativeWebView] = useState(false);
  const isEmbedded = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true" || isNativeWebView;
  const [kind, setKind] = useState<ReportKindFilter>("firsthand");
  const [sort, setSort] = useState<ReportSignalSort>("recent");
  const [product, setProduct] = useState("");
  const [offset, setOffset] = useState(0);
  const [subscriberAccess, setSubscriberAccess] = useState({ brand: "", open: false });
  const subscriberAccessOpen = subscriberAccess.brand === brandName && subscriberAccess.open;
  useEffect(() => { setIsNativeWebView(Boolean(window.ReactNativeWebView)); }, []);
  useEffect(() => { setKind("firsthand"); setSort("recent"); setProduct(""); setOffset(0); }, [brandName]);
  useEffect(() => { setSubscriberAccess({ brand: brandName, open: false }); }, [brandName, isSubscribed]);

  const publicReports = usePublicReportsByBrand(brandName, locale, Boolean(brandName) && !seo.unavailable, { kind, sort, product, offset }, initialPreview);
  const { items, totalCount, brandDisplayName, batch, metadata, metadataRetained, metadataReceivedAt, isLoading, isRefreshing, error, refresh, hasScopedCounts, isPreview } = publicReports;
  const publicRequestFinished = publicReports.hasCompletedRequest;
  const paidReports = useReportsByBrand(brandName, locale, isSubscribed && subscriberAccessOpen && publicRequestFinished);
  const changeKind = (nextKind: ReportKindFilter) => { setKind(nextKind); setOffset(0); };

  return (
    <div className="min-h-screen bg-white">
      <Seo title={seo.title} description={seo.description} path={seo.path} noindex={!seo.found && !seo.unavailable} />
      {isEmbedded ? <EmbeddedReportBackBar onBack={() => { void router.push({ pathname: "/", query: { tab: "digital" } }); }} /> : <PageHeader />}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">{brandDisplayName || brandName}</h1>
        <BrandOverview batch={metadata} locale={locale} brandName={brandName} brandDisplayName={brandDisplayName} />
        <EvidenceFilters kind={kind} sort={sort} product={product} batch={metadata} onKind={changeKind} onSort={(next) => { setSort(next); setOffset(0); }} onProduct={(next) => { setProduct(next); setOffset(0); }} />
        {metadataRetained && <p className="mb-3 text-xs text-gray-500" title={metadataReceivedAt ? `Received ${new Date(metadataReceivedAt).toLocaleString(locale)}` : undefined}>Counts from the last successful update.</p>}
        <section aria-label="Report evidence" aria-busy={isLoading || isRefreshing}>
          {seo.unavailable ? <div role="alert" className="py-8"><h2 className="text-lg font-semibold">Reports temporarily unavailable</h2><p className="mt-2 text-sm text-gray-600">Please try again shortly.</p></div> : isLoading ? <p role="status" className="py-12 text-sm text-gray-600">Loading reports…</p> : (
            <>
            {isRefreshing && <p role="status" className="mb-3 text-sm text-gray-600">Updating reports and counts…</p>}
            {error && <div role="alert" className="py-8"><h2 className="mb-2 text-lg font-semibold text-gray-900">{batch ? "Reports could not be updated" : "Reports could not be loaded"}</h2><p className="mb-3 text-sm text-gray-600">{batch ? "Showing the last loaded view. Please try again." : "Please try again."}</p><button type="button" onClick={refresh} className="min-h-[44px] rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">Retry</button></div>}
            {batch && (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500"><h2 className="text-sm font-semibold text-gray-900">{isPreview ? "Recent firsthand reports" : kind === "firsthand" ? "Personal experiences" : kind === "coverage" ? "News & discussion" : kind === "unknown" ? "Other reports" : "All reports"}</h2><p>{totalCount.toLocaleString(locale)} {hasScopedCounts ? (totalCount === 1 ? "result" : "results") : "results loaded"}</p></div>
              {isPreview ? <p className="mb-4 text-xs text-gray-500">A recent public sample. Report counts are not affected-user counts.</p> : !hasScopedCounts && <p className="mb-4 text-xs text-gray-500">Full counts are unavailable for this view.</p>}
              {items.length ? <PublicBrandDashboard items={items} pageBrand={brandName} activeKind={kind} /> : (
                <div className="border-y border-gray-100 py-8"><h3 className="mb-2 text-lg font-semibold text-gray-900">{isPreview ? "No recent firsthand reports in this preview" : "No reports in this view"}</h3><p className="max-w-xl text-sm leading-6 text-gray-600">Try another source type or product.</p><div className="mt-3 flex flex-wrap gap-4"><button type="button" onClick={() => changeKind("all")} className="min-h-[44px] text-sm font-semibold text-green-800 underline underline-offset-4">View all reports</button></div></div>
              )}
              {isPreview && !isRefreshing && !error && <button type="button" onClick={refresh} className="mt-5 min-h-[44px] font-semibold text-green-800 underline underline-offset-4">Load the full report view</button>}
              {(offset > 0 || batch?.has_more) && <nav aria-label="Report pages" className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4"><button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 12))} className="min-h-[44px] px-3 text-sm font-semibold text-green-800 disabled:text-gray-400">Previous</button><span className="text-xs text-gray-500">Results {offset + 1}–{offset + items.length}</span><button type="button" disabled={!batch?.has_more} onClick={() => setOffset(offset + 12)} className="min-h-[44px] px-3 text-sm font-semibold text-green-800 disabled:text-gray-400">Next</button></nav>}
            </>
            )}
            </>
          )}
        </section>
        <details className="mt-8 border-t border-gray-200 pt-4"><summary className="min-h-[44px] cursor-pointer text-base font-semibold text-gray-900">Ask about these reports</summary><p className="mb-4 text-xs text-gray-500">AI answers can include all source types. Follow the links to check the sources.</p><CleanIntelligencePanel orgId={brandName} totalReports={metadata?.overview?.total_reports ?? totalCount} /></details>
        {isSubscribed && (
          <details open={subscriberAccessOpen} onToggle={(event) => setSubscriberAccess({ brand: brandName, open: event.currentTarget.open })} className="mt-8 border-t border-gray-200 pt-5">
            <summary className="min-h-[44px] cursor-pointer text-lg font-semibold text-gray-900">Subscriber report access</summary>
            {subscriberAccessOpen && <div className="mt-4">{!publicRequestFinished || paidReports.isLoading ? (
              <p role="status" className="text-sm text-gray-600">Loading subscriber reports…</p>
            ) : paidReports.error ? (
              <p role="alert" className="text-sm text-red-700">Subscriber reports could not be loaded.</p>
            ) : (
              <>
                {paidReports.hasMore && <p className="mb-3 text-xs text-gray-500">Showing the latest {paidReports.brandReports.length} subscriber entries; this list displays up to 100.</p>}
                <SubscribedBrandDashboard brandReports={paidReports.brandReports} />
              </>
            )}</div>}
          </details>
        )}
      </div>
      {!isEmbedded && <Footer />}
    </div>
  );
}
