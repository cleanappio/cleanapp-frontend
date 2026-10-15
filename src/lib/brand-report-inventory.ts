import type { ReportWithAnalysis } from "@/components/GlobeView";

export type BrandReportInventoryPage = {
  reports: ReportWithAnalysis[];
  total_count?: number;
  high_priority_count?: number;
  medium_priority_count?: number;
  has_more?: boolean;
};

/** Preserve the existing 100-entry subscriber window across a 50-entry API cap. */
export async function fetchBrandReportInventory(
  fetchPage: (page: { n: number; offset: number }) => Promise<BrandReportInventoryPage>,
): Promise<BrandReportInventoryPage> {
  const firstPage = await fetchPage({ n: 100, offset: 0 });
  if (!Array.isArray(firstPage.reports)) throw new Error("Invalid brand inventory response");
  let lastPage = firstPage;
  let entries = firstPage.reports;
  if (firstPage.has_more && entries.length < 100) {
    if (!entries.length) throw new Error("Brand inventory pagination did not advance");
    lastPage = await fetchPage({ n: Math.min(100 - entries.length, 50), offset: entries.length });
    if (!Array.isArray(lastPage.reports)) throw new Error("Invalid brand inventory response");
    entries = [...entries, ...lastPage.reports];
  }
  // A concurrent insertion can shift the second offset and repeat prior entries.
  const seen = new Set<string>();
  const reports = entries.filter((item) => {
    const publicId = item.report?.public_id;
    const seq = item.report?.seq;
    const key = publicId ? `public:${publicId}` : seq ? `seq:${seq}` : null;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 100);
  return {
    ...firstPage,
    reports,
    has_more: Boolean(lastPage.has_more) || (firstPage.total_count ?? entries.length) > reports.length,
  };
}
