import type { GetServerSideProps } from "next";
import { LANDING_PAGES } from "@/content/landing-pages";
import { absoluteUrl } from "@/lib/seo";

type SitemapEntry = { path: string; priority: string; changefreq: string };

/** Public, indexable routes. Report/brand detail pages are client-rendered and omitted for now. */
export const SITEMAP_ENTRIES: SitemapEntry[] = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  ...LANDING_PAGES.map((page) => ({
    path: `/${page.slug}`,
    priority: page.slug.startsWith("solutions/") ? "0.8" : "0.9",
    changefreq: "weekly",
  })),
  { path: "/about", priority: "0.8", changefreq: "monthly" },
  { path: "/faq", priority: "0.7", changefreq: "monthly" },
  { path: "/pricing", priority: "0.8", changefreq: "monthly" },
  { path: "/download", priority: "0.7", changefreq: "monthly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

function buildSitemapXml(lastmod: string): string {
  const urls = SITEMAP_ENTRIES.map(
    (entry) =>
      `  <url>\n    <loc>${absoluteUrl(entry.path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(buildSitemapXml(new Date().toISOString().slice(0, 10)));
  res.end();
  return { props: {} };
};

// Never rendered: getServerSideProps ends the response.
export default function Sitemap() {
  return null;
}
