import Link from "next/link";
import Footer from "@/components/Footer";
import ReportComposer from "@/components/reporting/ReportComposer";
import { LANDING_PAGES } from "@/content/landing-pages";

const GUIDES = LANDING_PAGES.filter((page) => page.guide);
const SOLUTIONS = LANDING_PAGES.filter((page) => page.audience === "organization");

/** Indexable context beneath the existing live-map experience. */
export default function HomeSeoSection() {
  if (process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true") return null;

  return (
    <div className="bg-white">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-green-800">CleanApp · Physical & digital problems</p>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
              Something&apos;s wrong.<br />Who do you tell?
            </h1>
            <p className="mt-5 text-lg text-gray-700 leading-relaxed">
              A pothole. A blocked entrance. A website that won&apos;t let you finish.
              Tell us what happened. Add a photo or screenshot if it helps.
            </p>
            <Link href="/about" className="mt-5 inline-block text-sm font-medium text-green-800 underline-offset-4 hover:underline">How CleanApp works →</Link>
          </div>
          <div className="lg:pt-5">
            <ReportComposer />
          </div>
        </div>

        <div className="mt-16 grid gap-10 border-t border-gray-200 pt-10 md:grid-cols-2 md:gap-16">
          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">In a place you use</h2>
            <p className="mt-3 text-gray-700 leading-relaxed">Litter, damaged infrastructure, a hazard or a barrier to access. Describe the condition and where it is.</p>
            <Link href="/report-a-problem?kind=physical" className="mt-5 inline-block font-semibold text-green-800 hover:underline underline-offset-4">Report a physical problem →</Link>
          </section>
          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">On a screen you use</h2>
            <p className="mt-3 text-gray-700 leading-relaxed">A broken website, app error or digital access barrier. Explain what you tried and what went wrong.</p>
            <Link href="/report-a-problem?kind=digital" className="mt-5 inline-block font-semibold text-green-800 hover:underline underline-offset-4">Report a digital problem →</Link>
          </section>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Make your report useful</h2>
          <p className="mt-3 text-gray-700">A little context helps. Start with a short guide.</p>
          <ul className="mt-5 grid sm:grid-cols-2 gap-x-10 divide-y sm:divide-y-0 divide-gray-200">
            {GUIDES.map((page) => (
              <li key={page.slug} className="border-b border-gray-200">
                <Link href={`/${page.slug}`} className="flex min-h-14 items-center justify-between gap-4 py-4 font-medium text-green-800 hover:underline underline-offset-4">
                  {page.navLabel}<span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-gray-600 leading-relaxed">
            Also explore <Link href="/incident-reporting" className="text-green-800 underline underline-offset-4">incident reporting</Link>,{" "}
            <Link href="/hazard-reporting" className="text-green-800 underline underline-offset-4">hazards</Link>,{" "}
            <Link href="/litter-reporting" className="text-green-800 underline underline-offset-4">litter and waste</Link> or{" "}
            <Link href="/bug-reporting" className="text-green-800 underline underline-offset-4">software bugs</Link>.
          </p>
        </section>

        <section className="mt-16 border-t border-gray-200 pt-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-800">For organizations</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">Understand the problems people notice.</h2>
          <p className="mt-3 max-w-2xl text-gray-700 leading-relaxed">Explore physical and digital reports, AI-assisted analysis and maps for the places and products your team looks after.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOLUTIONS.map((page) => <li key={page.slug}><Link href={`/${page.slug}`} className="font-medium text-green-800 hover:underline underline-offset-4">{page.navLabel} →</Link></li>)}
          </ul>
          <div className="mt-7 flex flex-wrap gap-6 text-sm font-semibold">
            <Link href="/pricing" className="text-green-800 hover:underline underline-offset-4">Plans & pricing →</Link>
            <Link href="/company" className="text-gray-700 hover:underline underline-offset-4">Company, partners & investors →</Link>
          </div>
        </section>
      </section>
      <Footer />
    </div>
  );
}
