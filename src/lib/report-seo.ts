import type { GetServerSideProps } from "next";
import type { ReportClassification } from "@/lib/report-links";
import { fetchPublicSeoJson, isPublicSeoObject, publicSeoText } from "@/lib/public-seo-fetch";

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
    res.setHeader("Cache-Control", "no-store");
    const publicId = typeof params?.public_id === "string" ? params.public_id : "";
    const fallback: ReportSeoProps = {
      seo: {
        title: `${CLASS_LABEL[classification]} | CleanApp`,
        description: "Explore public problem reports and their source context on CleanApp.",
        image: null,
        found: false,
      },
    };
    if (!publicId || !/^[A-Za-z0-9_-]{1,128}$/.test(publicId)) return { notFound: true };

    try {
      const { status, data } = await fetchPublicSeoJson(
        `${LIVE_API}/api/v3/reports/by-public-id?public_id=${encodeURIComponent(publicId)}`,
      );
      if (status === 404) return { notFound: true };
      if (status !== 200 || !isPublicSeoObject(data) || !isPublicSeoObject(data.report) || data.report.public_id !== publicId) {
        return { props: fallback };
      }
      const report = data.report;
      if (data.is_public === false || report.is_public === false ||
        (typeof data.visibility === "string" && data.visibility !== "public") ||
        (typeof report.visibility === "string" && report.visibility !== "public")) return { props: fallback };
      const analyses = Array.isArray(data.analysis) ? data.analysis.filter(isPublicSeoObject) : [];
      const analysis =
        analyses.find((item) => item.language === (locale || "en")) || analyses.find((item) => item.language === "en") || analyses[0];
      // The legacy detail projection does not hydrate is_valid; its default
      // false is not a reliable moderation signal. Visibility is checked above.
      if (!analysis || (analysis.classification !== "physical" && analysis.classification !== "digital") || !publicSeoText(analysis.title)) return { props: fallback };
      if (analysis.classification !== classification) return {
        redirect: { destination: `/${analysis.classification}/report/${encodeURIComponent(publicId)}`, permanent: false },
      };
      const brand = publicSeoText(analysis.brand_display_name) || publicSeoText(analysis.brand_name);
      const title = `${publicSeoText(analysis.title)}${brand ? ` – ${brand}` : ""} | CleanApp`;
      const summary = publicSeoText(analysis.summary) || publicSeoText(analysis.description);
      const description = summary
        ? summary.length > 155 ? `${summary.slice(0, 152).trimEnd()}…` : summary
        : fallback.seo.description;
      const hasImage = typeof report.image === "string" && report.image.length > 0;
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
