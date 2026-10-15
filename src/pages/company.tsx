import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { ANDROID_APP_URL, IOS_APP_URL, breadcrumbJsonLd, jsonLdGraph, organizationJsonLd, webPageJsonLd } from "@/lib/seo";

const TITLE = "CleanApp Company | Product, Business Model & Investor Inquiries";
const DESCRIPTION = "Research CleanApp's physical and digital reporting platform, organization business model and public product sources. Contact the team for partnerships or investor inquiries.";
const SOURCES = [
  { title: "Public product", href: "/", detail: "Explore the map and available report views." },
  { title: "Organization plans", href: "/pricing", detail: "Review current scope, features and commercial terms." },
  { title: "Frontend source", href: "https://github.com/cleanappio/cleanapp-frontend", detail: "Inspect the public web implementation and repository history." },
  { title: "CleanApp on iOS", href: IOS_APP_URL, detail: "See the App Store listing and published app information." },
  { title: "CleanApp on Android", href: ANDROID_APP_URL, detail: "See the Google Play listing and published app information." },
];

export default function CompanyPage() {
  return (
    <>
      <Seo title={TITLE} description={DESCRIPTION} path="/company" jsonLd={jsonLdGraph([
        organizationJsonLd(), webPageJsonLd({ path: "/company", title: TITLE, description: DESCRIPTION }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Company", path: "/company" }]),
      ])} />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-800">CleanApp · Company</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-gray-900">A common starting point for the problems people notice.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-700">People notice problems everywhere. CleanApp turns those observations into structured reports, connects related issues and works to get the information to the people who can act.</p>
          <div className="mt-7 flex flex-wrap gap-5 items-center">
            <a href="mailto:info@cleanapp.io?subject=CleanApp%20company%20inquiry" className="inline-flex min-h-12 items-center rounded-md bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800">Contact the team</a>
            <Link href="/report-a-problem" className="font-semibold text-green-800 hover:underline underline-offset-4">Try reporting a problem →</Link>
          </div>
          <section className="mt-14">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">The product</h2>
            <p className="mt-4 leading-relaxed text-gray-700">A reporter sends a message, a photo or a screenshot about a physical or digital problem. AI structures the observation into a description, classification and relevant brand or place. CleanApp connects related reports and works to route useful information to relevant recipients.</p>
            <p className="mt-4 leading-relaxed text-gray-700">One report can show a broken entrance or failed checkout. Related reports can reveal a recurring problem across a place, product or brand. Public maps and report views make that evidence explorable; organization accounts give teams a way to work with observations about the things they look after.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">The business model</h2>
            <p className="mt-4 leading-relaxed text-gray-700">Reporting is free. Organizations pay for tools to work with reports about their brands and places, including alerts, analysis and dashboards. The <Link href="/pricing" className="text-green-800 underline underline-offset-4">current pricing page</Link> describes plan scope and features.</p>
            <p className="mt-4 leading-relaxed text-gray-700">For a city, a report might concern a street or public entrance. For a brand, it could concern packaging, a shop or an app. Property managers and safety teams look after sites where people encounter problems in person. CleanApp brings those observations into a common reporting platform.</p>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Primary product sources</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">Start with the product and its published materials when evaluating CleanApp.</p>
            <ul className="mt-5 divide-y divide-gray-200 border-y border-gray-200">
              {SOURCES.map((source) => <li key={source.href} className="py-5"><Link href={source.href} className="font-semibold text-green-800 hover:underline underline-offset-4" target={source.href.startsWith("http") ? "_blank" : undefined} rel={source.href.startsWith("http") ? "noopener noreferrer" : undefined}>{source.title} <span aria-hidden="true">{source.href.startsWith("http") ? "↗" : "→"}</span></Link><p className="mt-1 text-sm leading-relaxed text-gray-600">{source.detail}</p></li>)}
            </ul>
          </section>
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Partners & investors</h2>
            <p className="mt-4 leading-relaxed text-gray-700">For a product walkthrough, partnership discussion or investor inquiry, contact <a href="mailto:info@cleanapp.io" className="text-green-800 underline underline-offset-4">info@cleanapp.io</a>. The team can address current operations, commercial discussions and any materials appropriate to your inquiry.</p>
          </section>
        </article>
        <Footer />
      </div>
    </>
  );
}
