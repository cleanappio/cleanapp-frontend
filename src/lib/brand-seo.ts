import type { GetServerSideProps } from "next";
import { fetchPublicSeoJson, isPublicSeoObject, publicSeoText } from "@/lib/public-seo-fetch";

export type BrandSeoProps = { seo: { title: string; description: string; path: string; found: boolean } };
const LIVE_API = process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io";

export const getBrandSeoProps: GetServerSideProps<BrandSeoProps> = async ({ params, res }) => {
  res.setHeader("Cache-Control", "no-store");
  const name = typeof params?.brand_name === "string" ? params.brand_name.trim() : "";
  const fallback: BrandSeoProps = { seo: {
    title: "Brand reports | CleanApp", description: "Explore public problem reports on CleanApp.",
    path: `/digital/${encodeURIComponent(name)}`, found: false,
  } };
  if (!name || name.length > 128 || /[\u0000-\u001f\u007f]/.test(name)) return { notFound: true };
  try {
    // Metadata needs public presence, not the full evidence briefing's grouping
    // and exact counts. Share the inexpensive summary surface used by the sitemap.
    const query = new URLSearchParams({ classification: "digital", lang: "en" });
    const { status, data } = await fetchPublicSeoJson(`${LIVE_API}/api/v3/public/discovery/brands/summary?${query}`);
    if (status !== 200 || !Array.isArray(data)) return { props: fallback };
    const item = data.find((row: unknown) => isPublicSeoObject(row) &&
      (row.classification === undefined || row.classification === "digital") &&
      typeof row.brand_name === "string" && row.brand_name.trim().toLowerCase() === name.toLowerCase() &&
      typeof row.total === "number" && Number.isSafeInteger(row.total) && row.total > 0 &&
      row.is_public !== false && (row.visibility === undefined || row.visibility === "public"));
    if (!isPublicSeoObject(item)) return { props: fallback };
    const display = publicSeoText(item.brand_display_name, 128) || name;
    return { props: { seo: {
      title: `${display} reports | CleanApp`,
      description: `Explore public reports associated with ${display} on CleanApp, with source context and AI-assisted summaries.`,
      path: `/digital/${encodeURIComponent(String(item.brand_name).trim())}`, found: true,
    } } };
  } catch {
    return { props: fallback };
  }
};
