import React from "react";
import Link from "next/link";
import { LANDING_PAGES } from "@/content/landing-pages";
import { ANDROID_APP_URL, CLEANAPP_GPT_URL, IOS_APP_URL, SOCIAL_LINKS } from "@/lib/seo";

const REPORT_LINKS = [
  { label: "Report a problem", href: "/report-a-problem" },
  ...LANDING_PAGES.filter((page) => page.guide).map((page) => ({ label: page.navLabel, href: `/${page.slug}` })),
];
const SOLUTION_LINKS = LANDING_PAGES.filter((page) => page.audience === "organization").map((page) => ({ label: page.navLabel, href: `/${page.slug}` }));
const COMPANY_LINKS = [
  { label: "About CleanApp", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Press & brand", href: "/press" },
  { label: "Company & investors", href: "/company" },
  { label: "Questions & answers", href: "/faq" },
  { label: "Plans & pricing", href: "/pricing" },
  { label: "Privacy policy", href: "/privacy" },
];
const EXPLORE_LINKS = [
  { label: "Public report map", href: "/" },
  { label: "Download the app", href: "/download" },
  { label: "CleanApp for iOS", href: IOS_APP_URL },
  { label: "CleanApp for Android", href: ANDROID_APP_URL },
  { label: "CleanAppGPT", href: CLEANAPP_GPT_URL },
  { label: "Sign in", href: "/login" },
];

function FooterColumn({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{heading}</h2>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-gray-600 transition-colors hover:text-green-800 hover:underline underline-offset-4" target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
          <FooterColumn heading="Report a problem" links={REPORT_LINKS} />
          <FooterColumn heading="For organizations" links={SOLUTION_LINKS} />
          <FooterColumn heading="Company" links={COMPANY_LINKS} />
          <FooterColumn heading="Explore CleanApp" links={EXPLORE_LINKS} />
          <FooterColumn heading="Follow" links={SOCIAL_LINKS} />
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-600">
          <p className="max-w-3xl leading-relaxed">CleanApp helps people report physical and digital problems with a message, photo or screenshot. Explore public reports, AI-assisted analysis and organization plans.</p>
          <p className="mt-3">© {new Date().getFullYear()} CleanApp.</p>
        </div>
      </div>
    </footer>
  );
}
