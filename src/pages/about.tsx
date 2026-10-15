import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { breadcrumbJsonLd, jsonLdGraph, organizationJsonLd, softwareApplicationJsonLd, webPageJsonLd } from "@/lib/seo";

const TITLE = "About CleanApp | Physical & Digital Problem Reporting";
const DESCRIPTION = "CleanApp helps people document problems in the places and products they use. Learn about photo reporting, AI-assisted analysis and tools for organizations.";

export default function AboutPage() {
  return (
    <>
      <Seo title={TITLE} description={DESCRIPTION} path="/about" jsonLd={jsonLdGraph([
        organizationJsonLd(), softwareApplicationJsonLd(),
        webPageJsonLd({ path: "/about", title: TITLE, description: DESCRIPTION }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About CleanApp", path: "/about" }]),
      ])} />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-800">About CleanApp</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-gray-900">Problems are noticed before they are understood.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-700">A pothole. A broken entrance. A checkout that fails. CleanApp gives people a place to tell someone what happened, even when they do not know whom to tell.</p>
          <Link href="/report-a-problem" className="mt-7 inline-flex min-h-12 items-center rounded-md bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800">Report a problem →</Link>
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-xl">
            <Image src="/hero-one-button.jpg" alt="Illustration of reporting a pothole and a failed digital checkout" fill sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" priority />
          </div>
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">One starting point for physical and digital problems</h2>
            <p className="mt-4 leading-relaxed text-gray-700">Physical problems happen in streets, buildings, shops and products. Digital problems happen in websites, apps and interfaces. The starting point is simple: describe the issue, add an image if it helps and send.</p>
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4 font-semibold text-green-800">
              <Link href="/report-a-problem?kind=physical" className="hover:underline underline-offset-4">Report a physical problem →</Link>
              <Link href="/report-a-problem?kind=digital" className="hover:underline underline-offset-4">Report a digital problem →</Link>
            </div>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">What a report becomes</h2>
            <ol className="mt-5 list-decimal space-y-4 pl-6 text-gray-700 marker:font-semibold marker:text-green-800">
              <li><strong>Observation.</strong> Describe the problem in your browser or the mobile apps. Add a photo or screenshot if it helps.</li>
              <li><strong>Analysis.</strong> AI structures the observation, identifies relevant brands or places and connects related reports.</li>
              <li><strong>Routing.</strong> CleanApp works to get the information to relevant recipients. Organizations can explore reports, maps and related observations to investigate problems.</li>
            </ol>
            <p className="mt-5 leading-relaxed text-gray-700">Keep your submission receipt to check the status available for your report. You can also explore public observations on the map.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">For people who look after places and products</h2>
            <p className="mt-4 leading-relaxed text-gray-700">CleanApp is designed for people reporting problems and for teams that need to understand those observations. Explore the fit for <Link href="/solutions/cities" className="text-green-800 underline underline-offset-4">cities</Link>, <Link href="/solutions/brands" className="text-green-800 underline underline-offset-4">brands and product teams</Link>, <Link href="/solutions/property-managers" className="text-green-800 underline underline-offset-4">property managers</Link> and <Link href="/solutions/workplace-safety" className="text-green-800 underline underline-offset-4">safety teams</Link>.</p>
            <p className="mt-4 leading-relaxed text-gray-700">Reporting is free. Current organization plans and terms are listed on the <Link href="/pricing" className="text-green-800 underline underline-offset-4">pricing page</Link>.</p>
          </section>
          <section className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Learn more or get in touch</h2>
            <p className="mt-4 leading-relaxed text-gray-700">For product questions, partnerships and company inquiries, email <a href="mailto:info@cleanapp.io" className="text-green-800 underline underline-offset-4">info@cleanapp.io</a>. For primary product links, the business model and public code, visit <Link href="/company" className="text-green-800 underline underline-offset-4">Company & investors</Link>.</p>
          </section>
        </article>
        <Footer />
      </div>
    </>
  );
}
