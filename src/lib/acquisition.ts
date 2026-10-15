/** Coarse first-party counts. Never send URLs, free text, identities or report IDs. */
export const ACQUISITION_EVENTS = ["page_view", "report_composer_opened", "report_submit_started", "report_submit_accepted", "report_submit_error", "organization_interest", "company_contact_interest", "investor_contact_interest"] as const;
export const ACQUISITION_PAGES = ["home", "report", "pothole", "dumping", "website_problem", "accessibility", "reporting_category", "solution_brands", "solution_cities", "solution_property", "solution_safety", "company", "press", "pricing", "signup", "public_brand", "public_report", "other_public"] as const;
export const ACQUISITION_SOURCES = ["google", "bing", "duckduckgo", "yahoo", "brave", "other_external", "direct", "internal"] as const;
type Event = typeof ACQUISITION_EVENTS[number];
type Page = typeof ACQUISITION_PAGES[number];
type Source = typeof ACQUISITION_SOURCES[number];
export type AcquisitionEvent = { event: Event; page: Page; landing: Page; source: Source; surface: "page" | "widget" };

export function acquisitionPage(path: string): Page | null {
  const pathname = path.split(/[?#]/, 1)[0].replace(/^\/me(?=\/|$)/, "").replace(/\/$/, "") || "/";
  const exact: Record<string, Page> = { "/": "home", "/report-a-problem": "report", "/report-a-pothole": "pothole", "/report-illegal-dumping": "dumping", "/report-a-website-problem": "website_problem", "/report-an-accessibility-barrier": "accessibility", "/solutions/brands": "solution_brands", "/solutions/cities": "solution_cities", "/solutions/property-managers": "solution_property", "/solutions/workplace-safety": "solution_safety", "/company": "company", "/press": "press", "/pricing": "pricing", "/signup": "signup" };
  if (exact[pathname]) return exact[pathname];
  if (/^\/(?:physical|digital)\/report\/[^/]+$/.test(pathname)) return "public_report";
  if (/^\/digital\/[^/]+$/.test(pathname)) return "public_brand";
  if (/^\/(?:incident|hazard|bug|litter|environmental|safety|facility|community)-reporting$/.test(pathname)) return "reporting_category";
  if (/^\/(?:about|faq|download|blog(?:\/[^/]+)?)$/.test(pathname)) return "other_public";
  // Account, checkout, case, private dashboard and unknown routes are excluded.
  return null;
}

export function acquisitionSource(referrer: string, origin: string): Source {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    if (url.origin === origin) return "internal";
    const host = url.hostname.toLowerCase();
    if (/^(?:www\.)?google\.(?:com|[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host)) return "google";
    if (/^(?:www\.)?bing\.com$/.test(host)) return "bing";
    if (/^(?:www\.)?duckduckgo\.com$/.test(host)) return "duckduckgo";
    if (/^(?:[a-z]+\.)?yahoo\.com$/.test(host)) return "yahoo";
    if (host === "search.brave.com") return "brave";
  } catch { /* Malformed referrers remain a fixed category. */ }
  return "other_external";
}

export function readAcquisitionEvent(value: unknown): AcquisitionEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join(",") !== "event,landing,page,source,surface") return null;
  if (!(ACQUISITION_EVENTS as readonly unknown[]).includes(row.event) ||
      !(ACQUISITION_PAGES as readonly unknown[]).includes(row.page) ||
      !(ACQUISITION_PAGES as readonly unknown[]).includes(row.landing) ||
      !(ACQUISITION_SOURCES as readonly unknown[]).includes(row.source) ||
      (row.surface !== "page" && row.surface !== "widget")) return null;
  return { event: row.event as Event, page: row.page as Page, landing: row.landing as Page, source: row.source as Source, surface: row.surface as "page" | "widget" };
}

let entry: { landing: Page; source: Source } | undefined;
export function countAcquisition(event: Event, surface: "page" | "widget" = "page"): void {
  if (typeof window === "undefined") return;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
  const page = acquisitionPage(window.location.pathname);
  if (!page) return;
  entry ??= { landing: page, source: acquisitionSource(document.referrer, window.location.origin) };
  const payload = JSON.stringify({ event, page, ...entry, surface });
  // No cookies, identifiers, local storage, query strings or third-party receiver.
  void fetch("/api/acquisition", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, credentials: "omit", referrerPolicy: "no-referrer", keepalive: true }).catch(() => {});
}
