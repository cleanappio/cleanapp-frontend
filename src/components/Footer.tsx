import React from "react";
import Link from "next/link";
import { LANDING_PAGES } from "@/content/landing-pages";
import { ANDROID_APP_URL, CLEANAPP_GPT_URL, IOS_APP_URL } from "@/lib/seo";

const REPORTING_PAGES = LANDING_PAGES.filter((page) => !page.slug.startsWith("solutions/"));
const SOLUTION_PAGES = LANDING_PAGES.filter((page) => page.slug.startsWith("solutions/"));

const COMPANY_LINKS = [
  { label: "About CleanApp", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Pricing", href: "/pricing" },
  { label: "Live Report Map", href: "/" },
  { label: "Privacy Policy", href: "/privacy" },
];

const APP_LINKS = [
  { label: "Download the app", href: "/download" },
  { label: "CleanApp for iOS", href: IOS_APP_URL },
  { label: "CleanApp for Android", href: ANDROID_APP_URL },
  { label: "CleanAppGPT", href: CLEANAPP_GPT_URL },
  { label: "Sign in", href: "/login" },
];

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
        {heading}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-gray-600 hover:text-green-700"
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener" : undefined}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Site-wide footer and internal-link hub. Every marketing page links to every
 * keyword page from here so crawlers can reach the whole cluster in one hop.
 */
const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <FooterColumn
            heading="Reporting"
            links={REPORTING_PAGES.map((page) => ({
              label: page.navLabel,
              href: `/${page.slug}`,
            }))}
          />
          <FooterColumn
            heading="Solutions"
            links={SOLUTION_PAGES.map((page) => ({
              label: page.navLabel,
              href: `/${page.slug}`,
            }))}
          />
          <FooterColumn heading="Company" links={COMPANY_LINKS} />
          <FooterColumn heading="Get CleanApp" links={APP_LINKS} />
        </div>
        <div className="mt-10 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>
            CleanApp is the one-tap incident reporting, hazard reporting and bug
            reporting app. Photograph any physical or digital problem; AI
            classifies it and routes it to the brand, property owner or city
            responsible. Free for reporters, with live maps and risk insights for
            organizations.
          </p>
          <p className="mt-3">
            © {new Date().getFullYear()} CleanApp. Trash is cash.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
