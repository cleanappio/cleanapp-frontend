import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import {
  breadcrumbJsonLd,
  jsonLdGraph,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

const TITLE = "About CleanApp – The One-Tap Incident, Hazard & Bug Reporting Platform";
const DESCRIPTION =
  "CleanApp is an AI-powered reporting platform. Anyone can report a physical hazard or digital bug with one photo; brands, property owners and cities get live maps and risk insights.";

export default function AboutPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path="/about"
        jsonLd={jsonLdGraph([
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          webPageJsonLd({ path: "/about", title: TITLE, description: DESCRIPTION }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ])}
      />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">About CleanApp</h1>
          <p className="mt-5 text-lg text-gray-700 leading-relaxed">
            CleanApp is the world&apos;s easiest reporting tool. With one photo, anyone can
            report an incident, a safety hazard, litter, a broken product or a software bug.
            CleanApp&apos;s AI classifies the report, scores its severity, identifies the brand,
            property or city responsible and delivers it to them. Reporters earn rewards.
            Organizations get ground truth about the problems the public sees first.
          </p>
          <div className="relative mt-10 aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/hero-one-button.jpg"
              alt="One button for every problem: CleanApp capturing a pothole and a failed checkout"
              fill
              sizes="(min-width: 1024px) 896px, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Our mission</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Most of the world&apos;s problems are noticed long before they are reported. A
              pothole, a blocked fire exit, a recalled product on a shelf, a checkout page that
              crashes: someone saw it, but reporting was too much work, or they did not know whom
              to tell. CleanApp exists to make reporting any problem, anywhere, as easy as taking a
              photo, and to make sure that report reaches whoever can fix it.
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              We call it &ldquo;trash is cash&rdquo;: every report is valuable data. Reporters get
              rewarded for creating it, and brands, property owners and cities subscribe to use it
              to lower risk, cut costs and respond faster.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">What CleanApp does</h2>
            <ul className="mt-4 space-y-3 list-disc pl-6 text-gray-700">
              <li>
                <Link href="/incident-reporting" className="text-green-700 hover:underline">
                  Incident reporting
                </Link>
                : one-tap reports for safety incidents, near misses, damage and security issues.
              </li>
              <li>
                <Link href="/hazard-reporting" className="text-green-700 hover:underline">
                  Hazard reporting
                </Link>
                : AI hazard probability and severity scoring with exact location.
              </li>
              <li>
                <Link href="/bug-reporting" className="text-green-700 hover:underline">
                  Bug reporting
                </Link>
                : report bugs and digital hazards on any website, app or device with a screenshot.
              </li>
              <li>
                <Link href="/litter-reporting" className="text-green-700 hover:underline">
                  Litter and pollution reporting
                </Link>
                : brand-attributed litter data for cities, waste contractors and brands.
              </li>
              <li>
                <Link href="/report-a-problem" className="text-green-700 hover:underline">
                  Report a problem
                </Link>
                : a single channel for potholes, graffiti, broken infrastructure and more.
              </li>
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
            <ol className="mt-4 space-y-3 list-decimal pl-6 text-gray-700">
              <li>A reporter photographs a physical problem or screenshots a digital one in the CleanApp app or on the web.</li>
              <li>CleanApp AI classifies the report (physical or digital), scores litter, hazard and bug probability, assigns a severity level, detects the brand and writes a summary.</li>
              <li>The report is placed on the public live map and routed to the responsible organization through its preferred channel.</li>
              <li>Subscribed organizations see reports on dashboards with hotspot tracking, AI insights and alerts; reporters earn rewards for verified reports.</li>
            </ol>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Who uses CleanApp</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">
              CleanApp serves{" "}
              <Link href="/solutions/cities" className="text-green-700 hover:underline">cities and municipalities</Link>,{" "}
              <Link href="/solutions/brands" className="text-green-700 hover:underline">consumer and retail brands</Link>,{" "}
              <Link href="/solutions/property-managers" className="text-green-700 hover:underline">property and facilities managers</Link>{" "}
              and{" "}
              <Link href="/solutions/workplace-safety" className="text-green-700 hover:underline">workplace safety teams</Link>,
              alongside a global community of reporters who use the free app to make the places and
              products around them better.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Contact</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Email{" "}
              <a href="mailto:info@cleanapp.io" className="text-green-700 hover:underline">
                info@cleanapp.io
              </a>
              , follow{" "}
              <a href="https://x.com/cleanapp" className="text-green-700 hover:underline" rel="noopener" target="_blank">
                @cleanapp
              </a>{" "}
              or join the{" "}
              <a href="https://t.me/cleanapp" className="text-green-700 hover:underline" rel="noopener" target="_blank">
                CleanApp Telegram channel
              </a>
              . For plans and enterprise deployments, see{" "}
              <Link href="/pricing" className="text-green-700 hover:underline">pricing</Link>.
            </p>
          </section>
        </article>
        <Footer />
      </div>
    </>
  );
}
