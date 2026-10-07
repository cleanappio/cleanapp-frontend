import React from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { LANDING_PAGES, type LandingPageContent } from "@/content/landing-pages";
import {
  ANDROID_APP_URL,
  IOS_APP_URL,
  breadcrumbJsonLd,
  faqJsonLd,
  jsonLdGraph,
  webPageJsonLd,
} from "@/lib/seo";

type Props = { page: LandingPageContent };

/**
 * Renders one keyword landing page from src/content/landing-pages.ts.
 * Pure static markup so Next prerenders full HTML for crawlers.
 */
export default function LandingPage({ page }: Props) {
  const path = `/${page.slug}`;
  const breadcrumb = [
    { name: "Home", path: "/" },
    ...(page.breadcrumb ? [{ name: page.breadcrumb, path: "/report-a-problem" }] : []),
    { name: page.navLabel, path },
  ];
  const relatedPages = page.related
    .map((slug) => LANDING_PAGES.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is LandingPageContent => Boolean(candidate));

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path={path}
        jsonLd={jsonLdGraph([
          webPageJsonLd({ path, title: page.title, description: page.description }),
          breadcrumbJsonLd(breadcrumb),
          faqJsonLd(page.faqs),
        ])}
      />
      <div className="min-h-screen bg-white">
        <PageHeader />

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.path}>
                {index > 0 && <span className="mx-2">/</span>}
                {index < breadcrumb.length - 1 ? (
                  <Link href={crumb.path} className="hover:text-green-700">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="text-gray-700">{crumb.name}</span>
                )}
              </span>
            ))}
          </nav>

          <header>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">{page.h1}</h1>
            <p className="mt-5 text-lg text-gray-700 leading-relaxed">{page.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/download"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-md font-medium"
              >
                Get the free app
              </Link>
              <Link
                href="/pricing"
                className="bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-md font-medium"
              >
                Plans for organizations
              </Link>
              <Link
                href="/"
                className="border border-gray-300 hover:border-gray-500 text-gray-800 px-5 py-3 rounded-md font-medium"
              >
                See the live map
              </Link>
            </div>
          </header>

          {page.sections.map((section) => (
            <section key={section.heading} className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-2 list-disc pl-6 text-gray-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Frequently asked questions</h2>
            <dl className="mt-4 divide-y divide-gray-200">
              {page.faqs.map((faq) => (
                <div key={faq.question} className="py-4">
                  <dt className="font-semibold text-gray-900">{faq.question}</dt>
                  <dd className="mt-2 text-gray-700 leading-relaxed">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900">Start reporting in seconds</h2>
            <p className="mt-2 text-gray-700">
              CleanApp is free on iOS and Android. Organizations can claim their brand or area and
              start receiving reports today.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
              <a href={IOS_APP_URL} className="text-green-700 hover:underline" rel="noopener" target="_blank">
                Download for iOS
              </a>
              <a href={ANDROID_APP_URL} className="text-green-700 hover:underline" rel="noopener" target="_blank">
                Download for Android
              </a>
              <Link href="/signup" className="text-green-700 hover:underline">
                Create an organization account
              </Link>
            </div>
          </section>

          {relatedPages.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-gray-900">Related</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {relatedPages.map((related) => (
                  <li key={related.slug}>
                    <Link
                      href={`/${related.slug}`}
                      className="inline-block border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-800 hover:border-green-600 hover:text-green-700"
                    >
                      {related.navLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <Footer />
      </div>
    </>
  );
}
