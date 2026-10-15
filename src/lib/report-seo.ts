import type { GetServerSideProps } from "next";
import type { ReportClassification } from "@/lib/report-links";

/** Server-rendered metadata for a public report page, so crawlers and link previews see real content. */
export type ReportSeoProps = {
  seo: {
    title: string;
    description: string;
    image: string | null;
    found: boolean;
  };
};

const LIVE_API = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";

const CLASS_LABEL: Record<ReportClassification, string> = {
  physical: "Hazard report",
  digital: "Bug report",
};

/**
 * Fetch the report on the server and derive title/description/og:image.
 * Failures degrade to generic metadata; the client component still loads the report.
 */
export function makeReportSeoProps(
  classification: ReportClassification,
): GetServerSideProps<ReportSeoProps> {
  return async ({ params, res, locale }) => {
    const publicId = typeof params?.public_id === "string" ? params.public_id : "";
    const fallback: ReportSeoProps = {
      seo: {
        title: `${CLASS_LABEL[classification]} ${publicId} | CleanApp`,
        description: `A ${classification} report on CleanApp. Photo, location and AI analysis, routed to the brand or place responsible.`,
        image: null,
        found: false,
      },
    };
    if (!publicId) return { props: fallback };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(
        `${LIVE_API}/api/v3/reports/by-public-id?public_id=${encodeURIComponent(publicId)}`,
        { headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" },
      );
      clearTimeout(timer);
      if (!response.ok) {
        if (response.status === 404) res.statusCode = 404;
        return { props: fallback };
      }
      const data = await response.json();
      const analyses: Array<{ language?: string; title?: string; summary?: string; description?: string; brand_display_name?: string; brand_name?: string }> =
        Array.isArray(data?.analysis) ? data.analysis : [];
      const analysis =
        analyses.find((item) => item.language === (locale || "en")) || analyses[0] || {};
      const brand = analysis.brand_display_name || analysis.brand_name;
      const title = analysis.title
        ? `${analysis.title}${brand ? ` – ${brand}` : ""} | CleanApp`
        : fallback.seo.title;
      const summary = (analysis.summary || analysis.description || "").trim();
      const description = summary
        ? summary.length > 155 ? `${summary.slice(0, 152).trimEnd()}…` : summary
        : fallback.seo.description;
      const hasImage = Boolean(data?.report?.image);
      return {
        props: {
          seo: {
            title,
            description,
            image: hasImage
              ? `${LIVE_API}/api/v3/reports/rawimage/by-public-id?public_id=${encodeURIComponent(publicId)}`
              : null,
            found: true,
          },
        },
      };
    } catch {
      return { props: fallback };
    }
  };
}
