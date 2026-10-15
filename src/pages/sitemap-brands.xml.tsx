import type { GetServerSideProps } from "next";
import { absoluteUrl } from "@/lib/seo";
import { fetchPublicSeoJson, isPublicSeoObject } from "@/lib/public-seo-fetch";

const LIVE_API = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";
const CACHE_MS = 60 * 60 * 1000;

// One backend call per hour per server process; crawlers hit this often.
let cached: { xml: string; at: number } | null = null;
let retryAt = 0;

function xmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildXml(data: unknown): string {
  if (!Array.isArray(data)) throw new Error("Invalid brand summary");
  const names = new Map<string, string>();
  let validRows = 0;
  for (const row of data) {
    if (!isPublicSeoObject(row) || typeof row.brand_name !== "string" || typeof row.total !== "number" ||
      !Number.isSafeInteger(row.total) || row.total < 0 || (row.classification !== undefined && row.classification !== "digital")) continue;
    const name = row.brand_name.trim();
    if (!name || name.length > 128 || name === "." || name === ".." || /[\u0000-\u001f\u007f]/.test(name)) continue;
    validRows += 1;
    if (row.total > 0 && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  if (data.length && !validRows) throw new Error("Malformed brand rows");
  const urls = [...names.values()].map((name) => `  <url><loc>${xmlText(absoluteUrl(`/digital/${encodeURIComponent(name)}`))}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const now = Date.now();
  let stale = false;
  if (!cached || now - cached.at > CACHE_MS) {
    try {
      if (now < retryAt) throw new Error("Brand lookup retry pending");
      const { status, data } = await fetchPublicSeoJson(`${LIVE_API}/api/v3/public/discovery/brands/summary?classification=digital&lang=en`, 6000);
      if (status !== 200) throw new Error("Brand summary unavailable");
      cached = { xml: buildXml(data), at: Date.now() };
      retryAt = 0;
    } catch {
      if (now >= retryAt) retryAt = now + 60_000;
      stale = true;
      if (!cached) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Retry-After", "60");
        res.end("Sitemap temporarily unavailable.\n");
        return { props: {} };
      }
    }
  }
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", stale ? "public, s-maxage=60, stale-while-revalidate=60" : "public, s-maxage=3600, stale-while-revalidate=86400");
  res.end(cached.xml);
  return { props: {} };
};

export default function SitemapBrands() {
  return null;
}
