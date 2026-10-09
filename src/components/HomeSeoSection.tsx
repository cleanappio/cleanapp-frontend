import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import { LANDING_PAGES } from "@/content/landing-pages";

const REPORTING_PAGES = LANDING_PAGES.filter((page) => !page.slug.startsWith("solutions/"));
function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s/)[0];
}

const SOLUTION_PAGES = LANDING_PAGES.filter((page) => page.slug.startsWith("solutions/"));

/**
 * Indexable content below the full-screen globe on the homepage. The map is
 * visual-only to crawlers, so this section carries the H1, the value
 * proposition and links into the keyword page cluster.
 */
export default function HomeSeoSection() {
  // The native apps embed the map page; keep the embed map-only.
  if (process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true") {
    return null;
  }

  return (
    <div className="bg-white">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              The one-tap incident, hazard and bug reporting app
            </h1>
            <p className="mt-5 text-lg text-gray-700 leading-relaxed">
              CleanApp turns a single photo into a structured report. Snap a safety hazard, a
              broken product or a software bug; AI classifies it, scores its severity, identifies
              the brand or place responsible and routes it to them. The map above shows reports
              arriving from around the world in real time.
            </p>
            <p className="mt-4 text-lg text-gray-700 leading-relaxed">
              Reporting is free and needs no account. Brands, property managers and operators
              subscribe for live alerts, AI insights and incident hotspot tracking.
            </p>
          </div>
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/hero-one-button.jpg"
              alt="One button for every problem: CleanApp capturing a pothole and a failed checkout"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900">What you can report</h2>
            <ul className="mt-3 space-y-2">
              {REPORTING_PAGES.map((page) => (
                <li key={page.slug}>
                  <Link href={`/${page.slug}`} className="text-green-700 font-medium hover:underline">
                    {page.navLabel}
                  </Link>
                  <span className="text-gray-600"> — {firstSentence(page.description)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Who CleanApp is for</h2>
            <ul className="mt-3 space-y-2">
              {SOLUTION_PAGES.map((page) => (
                <li key={page.slug}>
                  <Link href={`/${page.slug}`} className="text-green-700 font-medium hover:underline">
                    {page.navLabel}
                  </Link>
                  <span className="text-gray-600"> — {firstSentence(page.description)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/download" className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-md font-medium">
            Get the free app
          </Link>
          <Link href="/about" className="border border-gray-300 hover:border-gray-500 text-gray-800 px-5 py-3 rounded-md font-medium">
            About CleanApp
          </Link>
          <Link href="/pricing" className="border border-gray-300 hover:border-gray-500 text-gray-800 px-5 py-3 rounded-md font-medium">
            Pricing
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
