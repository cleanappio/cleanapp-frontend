import React from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { LANDING_PAGES, reportingHref, type LandingPageContent } from "@/content/landing-pages";
import { breadcrumbJsonLd, faqJsonLd, jsonLdGraph, webPageJsonLd } from "@/lib/seo";

type Props = { page: LandingPageContent };

/** Useful, prerendered answers with a direct path to the reporting flow. */
export default function LandingPage({ page }: Props) {
  const path = `/${page.slug}`;
  const isOrganization = page.audience === "organization";
  const reportHref = reportingHref(page);
  const breadcrumb = [
    { name: "Home", path: "/" },
    { name: page.navLabel, path },
  ];
  const relatedPages = page.related
    .map((slug) => LANDING_PAGES.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is LandingPageContent => Boolean(candidate));
  const primaryHref = isOrganization ? "/pricing" : reportHref;
  const primaryLabel = isOrganization ? "Explore organization plans" : "Report this problem";
  const evidenceHref = page.evidenceLink?.href || "/";
  const evidenceLabel = page.evidenceLink?.label || "Explore public reports";

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
        <header className="border-b border-green-100 bg-green-50/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <nav aria-label="Breadcrumb" className="mb-8 text-sm text-gray-600">
              <Link href="/" className="hover:text-green-800 hover:underline">Home</Link>
              <span aria-hidden="true" className="mx-2">/</span>
              <span aria-current="page">{page.navLabel}</span>
            </nav>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-800">
              CleanApp {isOrganization ? "for organizations" : "reporting"}
            </p>
            <h1 className="max-w-3xl text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
              {page.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-gray-700 leading-relaxed">{page.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href={primaryHref} className="inline-flex min-h-12 items-center justify-center rounded-md bg-green-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">
                {primaryLabel}
              </Link>
              <Link href={evidenceHref} className="inline-flex min-h-12 items-center font-medium text-green-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">
                {evidenceLabel} <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </div>
            {!isOrganization && <p className="mt-3 text-sm text-gray-600">Report in your browser. No app download required.</p>}
          </div>
        </header>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {page.sections.map((section, index) => (
            <section key={section.heading} className={index > 0 ? "mt-12" : undefined}>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-gray-700 leading-relaxed">{paragraph}</p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-3 list-disc pl-6 text-gray-700 marker:text-green-700">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              )}
              {section.example && (
                <figure className="mt-5 border-l-4 border-green-200 bg-green-50/50 px-5 py-4">
                  <figcaption className="text-sm font-semibold text-green-900">{section.example.label}</figcaption>
                  <blockquote className="mt-2 text-gray-700 leading-relaxed">{section.example.text}</blockquote>
                </figure>
              )}
              {section.links && (
                <ul aria-label="Further reading" className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-green-800 underline underline-offset-4 hover:text-green-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">
                        {link.label} <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Common questions</h2>
            <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="cursor-pointer font-semibold text-gray-900 hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-gray-700 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-12 border-l-4 border-green-700 pl-6 py-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {isOrganization ? "Start with the reports relevant to your team." : "You can start with what you saw."}
            </h2>
            <p className="mt-3 text-gray-700 leading-relaxed">
              {isOrganization
                ? "Explore current plans, or discuss your locations, products and workflow with CleanApp."
                : "Describe the problem, add an image if it helps and send."}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 font-semibold">
              <Link href={primaryHref} className="text-green-800 underline underline-offset-4">{primaryLabel} →</Link>
              {isOrganization
                ? <a href="mailto:info@cleanapp.io" className="text-green-800 hover:underline underline-offset-4">Contact CleanApp</a>
                : <Link href="/download" className="text-gray-700 hover:underline underline-offset-4">Get the iOS or Android app</Link>}
            </div>
          </section>

          {relatedPages.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-semibold text-gray-900">Explore further</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {relatedPages.map((related) => (
                  <li key={related.slug}>
                    <Link href={`/${related.slug}`} className="block py-2 font-medium text-green-800 hover:underline underline-offset-4">
                      {related.navLabel} <span aria-hidden="true">→</span>
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
