import type { GetServerSideProps } from "next";
import { absoluteUrl } from "@/lib/seo";

const LIVE_API = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";
const CACHE_MS = 60 * 60 * 1000;

type BrandSummary = { brand_name: string; total: number };

// One backend call per hour per server process; crawlers hit this often.
let cached: { xml: string; at: number } | null = null;

async function fetchBrands(): Promise<BrandSummary[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(
      `${LIVE_API}/api/v3/public/discovery/brands/summary?classification=digital&lang=en`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function buildXml(brands: BrandSummary[], lastmod: string): string {
  const urls = brands
    .filter((brand) => brand.brand_name && brand.total > 0)
    .map(
      (brand) =>
        `  <url>\n    <loc>${absoluteUrl(`/digital/${encodeURIComponent(brand.brand_name)}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    const brands = await fetchBrands();
    cached = { xml: buildXml(brands, new Date().toISOString().slice(0, 10)), at: Date.now() };
  }
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(cached.xml);
  res.end();
  return { props: {} };
};

export default function SitemapBrands() {
  return null;
}
