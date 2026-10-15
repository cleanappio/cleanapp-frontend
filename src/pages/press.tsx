import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { ANDROID_APP_URL, IOS_APP_URL, SOCIAL_LINKS, breadcrumbJsonLd, jsonLdGraph, organizationJsonLd, webPageJsonLd } from "@/lib/seo";

const TITLE = "CleanApp Press Kit – Logo, Boilerplate & Brand Assets";
const DESCRIPTION =
  "Official CleanApp logos, product images, company boilerplate and facts for journalists, partners and anyone writing about CleanApp.";

const BOILERPLATE_SHORT =
  "CleanApp helps people report physical and digital problems with a message, photo or screenshot, using AI to structure observations, connect related reports and help route useful information.";

const BOILERPLATE_LONG =
  "CleanApp is a reporting platform for physical places and digital products. People can describe a hazard, damaged place, product issue or software bug in their browser, adding a photo or screenshot if it helps. AI structures the observation, connects related reports and helps identify relevant brands, places and recipients. Reporting is free. Organization plans offer tools for teams working with reports about their brands and places. CleanApp is available on iOS, Android and the web at cleanapp.io; current organization plans are listed at cleanapp.io/pricing.";

const ASSETS = [
  { label: "Primary logo (PNG, 1200×1200, white background)", href: "/cleanapp-logo-1200.png" },
  { label: "Logo, high resolution (PNG, transparent)", href: "/cleanapp-logo-high-res.png" },
  { label: "Sticker logo (PNG)", href: "/cleanapp-sticker-logo.png" },
  { label: "App icon (PNG, 512×512)", href: "/icon-512.png" },
  { label: "Product image: one button for every problem (JPG)", href: "/hero-one-button.jpg" },
  { label: "Social card (PNG, 1200×630)", href: "/cleanapp-social-card.png" },
];

const FACTS = [
  ["Product", "CleanApp – physical and digital problem reporting"],
  ["Platforms", "iOS, Android, web"],
  ["Price", "Reporting is free. See the current organization plans."],
  ["Who it is for", "People reporting problems; teams looking after brands, products, properties and public places"],
  ["Website", "https://www.cleanapp.io"],
  ["Press contact", "info@cleanapp.io"],
];

export default function PressPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path="/press"
        jsonLd={jsonLdGraph([
          organizationJsonLd(),
          webPageJsonLd({ path: "/press", title: TITLE, description: DESCRIPTION }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Press", path: "/press" },
          ]),
        ])}
      />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Press &amp; brand</p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">Writing about CleanApp</h1>
          <p className="mt-5 text-lg text-gray-600 leading-relaxed">
            Short and long descriptions, logos, product images and company links.
            Use the assets as they are; do not alter the logo.
          </p>

          <section className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 p-6 flex items-center justify-center bg-white">
              <Image src="/cleanapp-logo-high-res.png" alt="CleanApp logo" width={320} height={260} className="h-40 w-auto" />
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 flex items-center justify-center bg-gray-900">
              <Image src="/icon-512.png" alt="CleanApp app icon" width={160} height={160} className="h-32 w-32" />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Boilerplate</h2>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">One sentence</h3>
            <p className="mt-2 text-gray-700 leading-relaxed">{BOILERPLATE_SHORT}</p>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">One paragraph</h3>
            <p className="mt-2 text-gray-700 leading-relaxed">{BOILERPLATE_LONG}</p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Facts</h2>
            <dl className="mt-4 divide-y divide-gray-200">
              {FACTS.map(([term, detail]) => (
                <div key={term} className="py-3 grid sm:grid-cols-3 gap-2">
                  <dt className="text-sm font-semibold text-gray-900">{term}</dt>
                  <dd className="sm:col-span-2 text-gray-700">{detail}{term === "Price" && <> <Link href="/pricing" className="text-green-700 hover:underline">Plans &amp; pricing →</Link></>}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Downloads</h2>
            <ul className="mt-4 space-y-2">
              {ASSETS.map((asset) => (
                <li key={asset.href}>
                  <a href={asset.href} download className="text-green-700 hover:underline">
                    {asset.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              Name: &ldquo;CleanApp&rdquo; (one word, capital C and A). Not &ldquo;Clean App&rdquo;, not &ldquo;CleanApp.io&rdquo; in running text.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Official channels</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {[...SOCIAL_LINKS, { label: "App Store", href: IOS_APP_URL }, { label: "Google Play", href: ANDROID_APP_URL }].map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener" className="inline-block border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-800 hover:border-green-600 hover:text-green-700">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-gray-700">
              Questions, interviews, or data for a story: <a href="mailto:info@cleanapp.io" className="text-green-700 hover:underline">info@cleanapp.io</a>.
              Learn more <Link href="/about" className="text-green-700 hover:underline">about CleanApp</Link>{" "}
              or visit <Link href="/company" className="text-green-700 hover:underline">Company &amp; investors</Link>.
            </p>
          </section>
        </article>
        <Footer />
      </div>
    </>
  );
}
