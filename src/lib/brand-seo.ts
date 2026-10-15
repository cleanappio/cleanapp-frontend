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
    const query = new URLSearchParams({ brand_name: name, lang: "en", n: "12", kind: "all", sort: "recent", offset: "0" });
    const { status, data } = await fetchPublicSeoJson(`${LIVE_API}/api/v3/public/discovery/by-brand?${query}`);
    if (status !== 200 || !isPublicSeoObject(data) || !Array.isArray(data.items)) return { props: fallback };
    if (data.is_public === false || (typeof data.visibility === "string" && data.visibility !== "public")) return { props: fallback };
    if (isPublicSeoObject(data.scope) && typeof data.scope.brand_name === "string" && data.scope.brand_name.toLowerCase() !== name.toLowerCase()) return { props: fallback };
    const item = data.items.find((row: unknown) => isPublicSeoObject(row) && row.classification === "digital" &&
      typeof row.brand_name === "string" && row.brand_name.toLowerCase() === name.toLowerCase() &&
      publicSeoText(row.discovery_token) && publicSeoText(row.title));
    if (!isPublicSeoObject(item)) return { props: fallback };
    const display = publicSeoText(item.brand_display_name, 128) || name;
    return { props: { seo: {
      title: `${display} reports | CleanApp`,
      description: `Explore public reports associated with ${display} on CleanApp, with source context and AI-assisted summaries.`,
      path: `/digital/${encodeURIComponent(String(item.brand_name))}`, found: true,
    } } };
  } catch {
    return { props: fallback };
  }
};
