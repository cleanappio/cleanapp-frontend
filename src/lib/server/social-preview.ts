import { LANDING_PAGES } from "@/content/landing-pages";
import { ARTICLES } from "@/content/articles";
import { brandLabel } from "@/lib/report-evidence";
import { explicitlyNonpublic, projectPublicReport, safePublicReportId } from "@/lib/public-report-projection";
import { isPublicSeoObject, publicSeoText } from "@/lib/public-seo-fetch";
import { readThumbnailBody } from "@/lib/server/report-thumbnail";

export type PreviewKind = "brand" | "digital" | "physical" | "agents" | "editorial" | "organization" | "case" | "home";
export type SocialPreview = {
  kind: PreviewKind;
  label: string;
  title: string;
  subtitle: string;
  action: string;
  /** Dynamic public evidence is rechecked each time, never retained in the image cache. */
  dynamic?: boolean;
};

export class PreviewMissing extends Error {}
export class PreviewUnavailable extends Error {}

/** Canonical site paths only: no arbitrary URLs, query tokens, controls or traversal. */
export function normalizePreviewPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/") || /[?#\\\u0000-\u001f\u007f]/.test(value)) return null;
  let path: string;
  try { path = decodeURIComponent(value); } catch { return null; }
  if (/[?#\\\u0000-\u001f\u007f]/.test(path) || path.includes("//") || path.split("/").some(part => part === "." || part === "..")) return null;
  path = path.replace(/^\/(en|me)(?=\/|$)/, "").replace(/\/$/, "") || "/";
  return path;
}

const fixed: Record<string, Omit<SocialPreview, "action"> & { action?: string }> = {
  "/": { kind: "home", label: "PHYSICAL + DIGITAL", title: "See a problem?\nMake it count.", subtitle: "One place to report what needs attention.", action: "Explore CleanApp" },
  "/agents": { kind: "agents", label: "BUILT FOR AI AGENTS", title: "Agents,\nyou’re up.", subtitle: "Report problems. Track decisions and actions.", action: "Get the agent guide" },
  "/agents.txt": { kind: "agents", label: "MACHINE-READABLE GUIDE", title: "CleanApp\nfor agents.", subtitle: "MCP + HTTPS. No account or API key.", action: "Read the instructions" },
  "/report-a-problem": { kind: "home", label: "MAKE A REPORT", title: "Something\nneeds attention.", subtitle: "A message. A photo. A useful report.", action: "Report a problem" },
  "/blog": { kind: "editorial", label: "THE CLEANAPP FIELD GUIDE", title: "Better reports.\nBetter context.", subtitle: "Practical ideas for places, products and teams." },
  "/about": { kind: "home", label: "ABOUT CLEANAPP", title: "A clearer signal\nfrom the world.", subtitle: "Physical and digital problems, in one place." },
  "/company": { kind: "editorial", label: "THE COMPANY BEHIND CLEANAPP", title: "CleanApp,\nin context.", subtitle: "Product, business model and investor information." },
  "/pricing": { kind: "organization", label: "PLANS + PRICING", title: "Start with\na useful signal.", subtitle: "Free reporting. Plans for organizations." },
  "/download": { kind: "home", label: "CLEANAPP ON THE GO", title: "Spot it.\nReport it.", subtitle: "Physical and digital reporting for iOS and Android." },
  "/faq": { kind: "editorial", label: "QUESTIONS, ANSWERED", title: "How CleanApp\nworks.", subtitle: "Reporting, evidence and what happens next." },
  "/privacy": { kind: "editorial", label: "PRIVACY", title: "Your information.\nClearly explained.", subtitle: "Read CleanApp’s privacy policy." },
  "/press": { kind: "editorial", label: "PRESS + BRAND", title: "The CleanApp\nstory.", subtitle: "Company information and media resources." },
  "/epc": { kind: "organization", label: "ETHEREUM PLUS CODES", title: "Every place.\nA public address.", subtitle: "Find EPC addresses for brands and places.", action: "Explore the noticeboard" },
  "/new-york": { kind: "physical", label: "NEW YORK", title: "A better signal\nfor the city.", subtitle: "Explore CleanApp reports in New York." },
  "/montenegro": { kind: "physical", label: "MONTENEGRO", title: "Local problems.\nShared context.", subtitle: "Explore CleanApp reports in Montenegro." },
  "/edgecity": { kind: "physical", label: "EDGE CITY", title: "Spot a problem.\nShare the context.", subtitle: "Explore the CleanApp community view." },
  "/devconnect2025": { kind: "physical", label: "DEVCONNECT 2025", title: "Make the place\nwork better.", subtitle: "Explore the CleanApp event view." },
  "/redbull": { kind: "brand", label: "PUBLIC REPORTS", title: "RED BULL", subtitle: "Reports and context, on CleanApp.", action: "Explore reports" },
  "/cleanapppro": { kind: "organization", label: "CLEANAPP PRO", title: "See the signal.\nUnderstand the issue.", subtitle: "Tools for working with problem reports." },
  "/areas_map": { kind: "physical", label: "PLACES + REPORTS", title: "Put the problem\nin context.", subtitle: "Explore the CleanApp map." },
};

/** No remote data is used for public guides or neutral workspace/case artwork. */
export function staticSocialPreview(path: string): SocialPreview {
  const known = fixed[path];
  if (known) return { ...known, action: known.action || "Explore the page" };
  const landing = LANDING_PAGES.find(page => `/${page.slug}` === path);
  if (landing) return {
    kind: landing.audience === "organization" ? "organization" : landing.reportKind === "digital" ? "digital" : "physical",
    label: landing.audience === "organization" ? "FOR ORGANIZATIONS" : landing.guide ? "REPORTING GUIDE" : "PROBLEM REPORTING",
    title: landing.navLabel,
    subtitle: landing.audience === "organization" ? "Understand the reports that matter to your team." : landing.reportKind === "digital" ? "Bugs, service issues and broken digital experiences." : "Make the condition clear. Share the context.",
    action: landing.audience === "organization" ? "Explore the solution" : "See how to report",
  };
  const article = ARTICLES.find(item => `/blog/${item.slug}` === path);
  if (article) return { kind: "editorial", label: "THE CLEANAPP FIELD GUIDE", title: article.title, subtitle: "Practical guidance for places, products and teams.", action: "Read the guide" };
  if (/^\/cases\/[^/]+$/.test(path)) return { kind: "case", label: "CASE EVIDENCE", title: "Connected reports.\nA clearer picture.", subtitle: "Explore the evidence and context in a CleanApp case.", action: "Open the case" };
  // No authenticated workspace content or unverified route text enters a preview.
  return { kind: "home", label: "CLEANAPP", title: "A problem worth\npaying attention to.", subtitle: "Physical and digital reporting, in one place.", action: "Explore CleanApp" };
}

/** Fixed first-party public reader, complete-body deadline, bounded bytes, no credentials/redirects. */
async function publicJson(path: string, fetcher: typeof fetch): Promise<unknown> {
  const base = (process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io").replace(/\/$/, "");
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => { controller.abort(); reject(new PreviewUnavailable()); }, 4000);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetcher(`${base}${path}`, { signal: controller.signal, redirect: "error", cache: "no-store", credentials: "omit", headers: { Accept: "application/json" } });
      if ([404, 410].includes(response.status)) throw new PreviewMissing();
      if (!response.ok) throw new PreviewUnavailable();
      return JSON.parse((await readThumbnailBody(response, 8 * 1024 * 1024)).toString("utf8")) as unknown;
    })()]);
  } catch (error) {
    if (error instanceof PreviewMissing) throw error;
    throw new PreviewUnavailable();
  } finally { clearTimeout(timeout); }
}

export async function resolveSocialPreview(path: string, fetcher: typeof fetch = fetch): Promise<SocialPreview> {
  const reportMatch = path.match(/^\/(digital|physical)\/report\/([^/]+)$/);
  if (reportMatch) {
    const [, kind, id] = reportMatch;
    if (!safePublicReportId(id)) throw new PreviewMissing();
    const raw = await publicJson(`/api/v3/reports/by-public-id?public_id=${encodeURIComponent(id)}`, fetcher);
    if (explicitlyNonpublic(raw) || (isPublicSeoObject(raw) && explicitlyNonpublic(raw.report))) throw new PreviewMissing();
    const report = projectPublicReport(raw, id, "en");
    if (!report) throw new PreviewUnavailable();
    const analysis = report.analysis[0];
    if (analysis.classification !== kind) throw new PreviewMissing();
    const brand = analysis.brand_display_name || analysis.brand_name;
    return { kind: kind as "digital" | "physical", label: brand ? `${kind.toUpperCase()} REPORT · ${brand}` : `${kind.toUpperCase()} PROBLEM REPORT`, title: analysis.title || "Public problem report", subtitle: "An observation. The evidence. The original context.", action: "Read the report", dynamic: true };
  }
  const brandMatch = path.match(/^\/digital\/([^/]+)$/);
  if (brandMatch) {
    const name = brandMatch[1];
    if (name.length > 128) throw new PreviewMissing();
    const query = new URLSearchParams({ brand_name: name, lang: "en", n: "1", evidence_kind: "firsthand" });
    const data = await publicJson(`/api/v3/public/discovery/brand-preview?${query}`, fetcher);
    if (!isPublicSeoObject(data)) throw new PreviewUnavailable();
    if (explicitlyNonpublic(data) || data.brand_found === false) throw new PreviewMissing();
    if (data.brand_found !== true || data.classification !== "digital" || data.evidence_kind !== "firsthand" || typeof data.brand_name !== "string" || data.brand_name.trim().toLowerCase() !== name.toLowerCase()) throw new PreviewUnavailable();
    const display = brandLabel(data.brand_name, publicSeoText(data.brand_display_name, 128) || data.brand_name);
    return { kind: "brand", label: "DIGITAL · PUBLIC REPORTS", title: display.toUpperCase(), subtitle: "Firsthand experiences. Original evidence.", action: "Explore the reports", dynamic: true };
  }
  const legacy = path.match(/^\/digital\/([^/]+)\/report\/\d+$/);
  if (legacy) return { kind: "digital", label: "DIGITAL PROBLEM REPORT", title: "The issue.\nIn context.", subtitle: "Open the current CleanApp report and its evidence.", action: "View the report" };
  return staticSocialPreview(path);
}
