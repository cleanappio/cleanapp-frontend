import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { LANDING_PAGES } from "@/content/landing-pages";
import { breadcrumbJsonLd, faqJsonLd, jsonLdGraph, webPageJsonLd } from "@/lib/seo";

const TITLE = "CleanApp FAQ – Incident, Hazard, Litter & Bug Reporting Questions";
const DESCRIPTION =
  "Answers to common questions about reporting incidents, hazards, litter and bugs with CleanApp, how routing and rewards work, and what organizations get.";

const GENERAL_FAQS = [
  {
    question: "What is CleanApp?",
    answer:
      "CleanApp is a free one-tap reporting app for physical and digital problems. Take a photo of a hazard, incident, litter or a software bug; CleanApp's AI classifies it, scores severity, identifies the responsible brand, property or city and routes the report to them.",
  },
  {
    question: "Is CleanApp free?",
    answer:
      "Yes. Reporting is free on iOS, Android and the web, and reporters earn rewards for verified reports. Organizations pay for CleanApp Pro or Enterprise to receive live alerts, dashboards, AI insights and hotspot analytics.",
  },
  {
    question: "What is the difference between physical and digital reports?",
    answer:
      "Physical reports document real-world problems such as litter, hazards, damage and unsafe conditions. Digital reports document problems in software: bugs, crashes, broken flows, scams and dark patterns. CleanApp's AI classifies each report automatically.",
  },
  {
    question: "Where can I download CleanApp?",
    answer:
      "CleanApp is available on the Apple App Store and Google Play, and reports can also be viewed on the web at cleanapp.io. Visit cleanapp.io/download to get the right version for your device.",
  },
  {
    question: "What does 'trash is cash' mean?",
    answer:
      "Every report is valuable data about a problem someone can fix. CleanApp rewards reporters for producing that data and sells the resulting intelligence to the organizations that need it, so reporting trash, hazards and bugs literally creates value.",
  },
];

// Aggregate every page's FAQs into one hub page (and one FAQPage schema).
const ALL_FAQS = [
  ...GENERAL_FAQS,
  ...LANDING_PAGES.flatMap((page) => page.faqs),
];

export default function FaqPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path="/faq"
        jsonLd={jsonLdGraph([
          webPageJsonLd({ path: "/faq", title: TITLE, description: DESCRIPTION }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
          faqJsonLd(ALL_FAQS),
        ])}
      />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900">Frequently asked questions</h1>
          <p className="mt-4 text-lg text-gray-700">
            Everything about reporting with CleanApp. For a deeper look at a topic, see{" "}
            <Link href="/incident-reporting" className="text-green-700 hover:underline">incident reporting</Link>,{" "}
            <Link href="/hazard-reporting" className="text-green-700 hover:underline">hazard reporting</Link>,{" "}
            <Link href="/bug-reporting" className="text-green-700 hover:underline">bug reporting</Link>{" "}
            or <Link href="/about" className="text-green-700 hover:underline">about CleanApp</Link>.
          </p>

          <section className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900">General</h2>
            <dl className="mt-4 divide-y divide-gray-200">
              {GENERAL_FAQS.map((faq) => (
                <div key={faq.question} className="py-4">
                  <dt className="font-semibold text-gray-900">{faq.question}</dt>
                  <dd className="mt-2 text-gray-700 leading-relaxed">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          {LANDING_PAGES.map((page) => (
            <section key={page.slug} className="mt-10">
              <h2 className="text-2xl font-bold text-gray-900">
                <Link href={`/${page.slug}`} className="hover:text-green-700">
                  {page.navLabel}
                </Link>
              </h2>
              <dl className="mt-4 divide-y divide-gray-200">
                {page.faqs.map((faq) => (
                  <div key={faq.question} className="py-4">
                    <dt className="font-semibold text-gray-900">{faq.question}</dt>
                    <dd className="mt-2 text-gray-700 leading-relaxed">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </article>
        <Footer />
      </div>
    </>
  );
}
