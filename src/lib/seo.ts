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

/** Official profiles, as listed on github.com/cleanappio. Used in footer and schema sameAs. */
export const SOCIAL_LINKS = [
  { label: "X", href: "https://x.com/cleanapp" },
  { label: "YouTube", href: "https://www.youtube.com/@cleanappio" },
  { label: "Medium", href: "https://medium.com/@cleanapp" },
  { label: "Instagram", href: "https://www.instagram.com/cleanapp/" },
  { label: "Telegram", href: "https://t.me/cleanappio" },
  { label: "GitHub", href: "https://github.com/cleanappio" },
];

export const DEFAULT_TITLE =
  "CleanApp | Report Physical & Digital Problems";
export const DEFAULT_DESCRIPTION =
  "Something broken, unsafe or not working? Tell CleanApp. Describe a physical or digital problem, add an image if it helps and explore public reports.";

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
    alternateName: ["CleanApp.io", "Clean App"],
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/cleanapp-logo-1200.png`,
      width: 1200,
      height: 1200,
    },
    image: `${SITE_URL}/cleanapp-logo-1200.png`,
    description:
      "CleanApp is a reporting platform for physical and digital problems. People submit observations with text and images; organizations can explore reports, maps and AI-assisted analysis.",
    sameAs: [...SOCIAL_LINKS.map((link) => link.href), ANDROID_APP_URL, IOS_APP_URL],
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
    alternateName: "CleanApp – Physical & Digital Problem Reporting",
    url: SITE_URL,
    image: `${SITE_URL}/cleanapp-logo-1200.png`,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Problem reporting",
    operatingSystem: "iOS, Android, Web",
    installUrl: [IOS_APP_URL, ANDROID_APP_URL],
    downloadUrl: `${SITE_URL}/download`,
    description:
      "Document physical and digital problems with text and optional images. Explore public reports, maps and AI-assisted analysis.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to report. Paid plans for organizations.",
      url: `${SITE_URL}/pricing`,
    },
    featureList: [
      "Photo and screenshot problem reporting",
      "Physical and digital report categories",
      "Location and product context",
      "AI-assisted report analysis",
      "Public report map and organization views",
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
