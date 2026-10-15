import type { GetServerSideProps } from "next";
import { LANDING_PAGES } from "@/content/landing-pages";
import { ARTICLES } from "@/content/articles";
import { absoluteUrl } from "@/lib/seo";

/** Public content routes. Add report detail URLs only when publication is verified. */
export const SITEMAP_ENTRIES = [
  { path: "/" },
  ...LANDING_PAGES.map((page) => ({ path: `/${page.slug}` })),
  { path: "/about" },
  { path: "/company" },
  { path: "/press" },
  { path: "/blog" },
  ...ARTICLES.map((article) => ({ path: `/blog/${article.slug}` })),
  { path: "/faq" },
  { path: "/pricing" },
  { path: "/download" },
  { path: "/privacy" },
];

// lastmod is intentionally omitted: the request date is not a content modification date.
function buildSitemapXml(): string {
  const urls = SITEMAP_ENTRIES.map((entry) => `  <url><loc>${absoluteUrl(entry.path)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(buildSitemapXml());
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
