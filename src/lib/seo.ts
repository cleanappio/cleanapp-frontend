/**
 * Site-wide SEO constants and JSON-LD builders.
 * Keep all public-facing identity facts (name, URLs, app store links,
 * social handles) here so metadata, structured data, sitemap and llms.txt
 * never drift apart.
 */

export const SITE_URL = "https://www.cleanapp.io";
export const SITE_NAME = "CleanApp";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/cleanapp-social-card.png`;
export const TWITTER_HANDLE = "@cleanapp";

export const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.cleanapp";
export const IOS_APP_URL = "https://apps.apple.com/us/app/cleanapp/id6466403301";
export const CLEANAPP_GPT_URL = "https://chatgpt.com/g/g-xXwTp3jI5-cleanapp";

export const DEFAULT_TITLE =
  "CleanApp – Incident, Hazard & Bug Reporting App | Report Anything in One Tap";
export const DEFAULT_DESCRIPTION =
  "CleanApp is the one-tap incident reporting app for physical hazards and digital bugs. Snap a photo, AI classifies and routes it to the brand, property owner or city responsible. Free for reporters; live risk maps and dashboards for organizations.";

/** Absolute URL for a site path ("/about" -> "https://www.cleanapp.io/about"). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? SITE_URL : `${SITE_URL}${clean}`;
}

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/cleanapp-logo-high-res.png`,
    },
    description:
      "CleanApp is an AI-powered incident, hazard and bug reporting platform. People report problems with one photo; organizations get live maps, risk insights and routing to the party responsible.",
    sameAs: [
      "https://x.com/cleanapp",
      "https://t.me/cleanapp",
      ANDROID_APP_URL,
      IOS_APP_URL,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@cleanapp.io",
      url: `${SITE_URL}/about`,
    },
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en",
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@type": ["SoftwareApplication", "MobileApplication"],
    "@id": APP_ID,
    name: "CleanApp",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Incident reporting",
    operatingSystem: "iOS, Android, Web",
    installUrl: [IOS_APP_URL, ANDROID_APP_URL],
    downloadUrl: `${SITE_URL}/download`,
    description:
      "One-tap incident, hazard, litter and bug reporting app. Photo in, AI-classified report out, routed to whoever is responsible.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to report. Paid plans for organizations.",
      url: `${SITE_URL}/pricing`,
    },
    featureList: [
      "One-tap photo incident reporting",
      "Hazard reporting with GPS location",
      "Bug and digital issue reporting",
      "AI classification and severity scoring",
      "Automatic routing to responsible brand, property owner or city",
      "Live incident map and dashboards",
      "Rewards for reporters",
    ],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type FaqItem = { question: string; answer: string };

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function webPageJsonLd(opts: {
  path: string;
  title: string;
  description: string;
}) {
  return {
    "@type": "WebPage",
    "@id": `${absoluteUrl(opts.path)}#webpage`,
    url: absoluteUrl(opts.path),
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": APP_ID },
    inLanguage: "en",
  };
}

/** Wrap one or more schema.org nodes in a single @graph document. */
export function jsonLdGraph(nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
