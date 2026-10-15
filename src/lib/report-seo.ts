import type { GetServerSideProps } from "next";
import type { ReportClassification } from "@/lib/report-links";
import { fetchPublicSeoJson, isPublicSeoObject, publicSeoUnavailable } from "@/lib/public-seo-fetch";
import { explicitlyNonpublic, projectPublicReport, safePublicReportId, type PublicReportView } from "@/lib/public-report-projection";

export type ReportSeoProps = {
  seo: { title: string; description: string; image: string | null; found: boolean; unavailable?: boolean };
  initialReport: PublicReportView | null;
};
const LIVE_API = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";

/** Render only current public evidence, with the same allowlisted data for hydration. */
export function makeReportSeoProps(classification: ReportClassification): GetServerSideProps<ReportSeoProps> {
  return async ({ params, res, locale }) => {
    res.setHeader("Cache-Control", "no-store");
    const publicId = typeof params?.public_id === "string" ? params.public_id : "";
    if (!safePublicReportId(publicId)) return { notFound: true };
    const unavailable: ReportSeoProps = {
      seo: { title: "Report temporarily unavailable | CleanApp", description: "This public report is temporarily unavailable. Please try again shortly.", image: null, found: false, unavailable: true },
      initialReport: null,
    };
    try {
      const { status, data } = await fetchPublicSeoJson(`${LIVE_API}/api/v3/reports/by-public-id?public_id=${encodeURIComponent(publicId)}`);
      if ([404, 410].includes(status)) return { notFound: true };
      if (status !== 200) { publicSeoUnavailable(res); return { props: unavailable }; }
      if (explicitlyNonpublic(data) || (isPublicSeoObject(data) && explicitlyNonpublic(data.report))) return { notFound: true };
      const report = projectPublicReport(data, publicId, locale || "en");
      if (!report) { publicSeoUnavailable(res); return { props: unavailable }; }
      const analysis = report.analysis[0];
      if (analysis.classification !== classification) return {
        redirect: { destination: `/${analysis.classification}/report/${encodeURIComponent(publicId)}`, permanent: false },
      };
      const brand = analysis.brand_display_name || analysis.brand_name;
      const title = `${analysis.title}${brand ? ` – ${brand}` : ""} | CleanApp`;
      const summary = analysis.summary || "Public problem report with source context and AI-assisted analysis.";
      const description = summary.length > 155 ? `${summary.slice(0, 152).trimEnd()}…` : summary;
      // Only the sanitized evidence projection can authorize an original image.
      // The legacy reader can retain bytes even when privacy rules suppress media.
      const hasImage = report.evidence?.has_original_media === true && isPublicSeoObject(data) && isPublicSeoObject(data.report) && typeof data.report.image === "string" && data.report.image.length > 0;
      const image = hasImage ? `${LIVE_API}/api/v3/reports/rawimage/by-public-id?public_id=${encodeURIComponent(publicId)}` : null;
      if (image) report.report.image = image;
      return { props: { seo: { title, description, image, found: true }, initialReport: report } };
    } catch {
      publicSeoUnavailable(res);
      return { props: unavailable };
    }
  };
}
