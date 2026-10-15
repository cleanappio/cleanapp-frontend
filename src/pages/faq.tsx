import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { breadcrumbJsonLd, faqJsonLd, jsonLdGraph, webPageJsonLd } from "@/lib/seo";

const TITLE = "CleanApp FAQ | Reporting, Report Status & Organizations";
const DESCRIPTION = "How do I report a problem? Who receives it? What happens next? Answers about physical and digital reporting, report status and organization plans on CleanApp.";

const FAQ_GROUPS = [
  {
    heading: "Reporting a problem",
    items: [
      { question: "What can I report to CleanApp?", answer: "You can document physical and digital problems: litter, damaged infrastructure, hazards, access barriers, product issues, broken websites and app errors. Describe what happened and add a photo or screenshot if it helps." },
      { question: "Do I need to download an app?", answer: "No. You can use the browser reporting form at cleanapp.io/report-a-problem. CleanApp is also available on iOS and Android." },
      { question: "Is reporting free?", answer: "Yes. Reporting is free. Paid organization plans cover additional ways for teams to work with reports about their brands and places; the pricing page lists current plans." },
      { question: "What if I do not know whom to tell?", answer: "Start with the place or product you can identify and describe what went wrong. CleanApp uses AI to structure the observation, identify relevant brands or places and help route the information." },
    ],
  },
  {
    heading: "What happens to a report",
    items: [
      { question: "What does a submission receipt confirm?", answer: "The receipt confirms the status available for your submission. It is not a confirmation that an organization has received the report or fixed the problem. Keep it to check available updates and a public report link when one is available." },
      { question: "Will every report appear on the public map immediately?", answer: "Reports go through processing and publication checks. Your receipt shows the status available and links to a public report when one is available." },
      { question: "Can AI identify the cause of a problem?", answer: "AI helps describe and classify observations. Your own context matters: explain what happened, where or in which product, and what you expected. That makes the report more useful to someone investigating it." },
      { question: "What information should I leave out?", answer: "Include only what is needed to explain the problem. Remove passwords, payment details, access codes and other people's private information from images and descriptions. Review CleanApp's privacy policy for information about data handling." },
      { question: "Is CleanApp an emergency or official city service?", answer: "No. CleanApp is an independent reporting platform. For immediate danger, contact the appropriate local emergency service. Use the designated authority or organization process when an official request is required." },
    ],
  },
  {
    heading: "Organizations, partners & company",
    items: [
      { question: "Who are the organization plans for?", answer: "They are intended for teams working with reports about places and products, including cities, brands, property managers and safety teams. Explore the relevant solution page and current pricing to evaluate the fit." },
      { question: "Can CleanApp connect to our existing tools?", answer: "Tell the CleanApp team how your organization reviews and handles reports. Discuss the required handoff to existing tools as part of planning your deployment." },
      { question: "Where can I research the company or discuss a partnership?", answer: "The company page links to the product, current plans, app listings and frontend repository. Contact info@cleanapp.io for product walkthroughs, partnerships and investor inquiries." },
    ],
  },
];
const ALL_FAQS = FAQ_GROUPS.flatMap((group) => group.items);

export default function FaqPage() {
  return (
    <>
      <Seo title={TITLE} description={DESCRIPTION} path="/faq" jsonLd={jsonLdGraph([
        webPageJsonLd({ path: "/faq", title: TITLE, description: DESCRIPTION }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Questions & answers", path: "/faq" }]),
        faqJsonLd(ALL_FAQS),
      ])} />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-800">CleanApp · Questions & answers</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">From noticing a problem to making a report.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-700">How to start, what happens next and how to evaluate CleanApp for a team.</p>
          {FAQ_GROUPS.map((group) => (
            <section key={group.heading} className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{group.heading}</h2>
              <dl className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
                {group.items.map((faq) => <div key={faq.question} className="py-5"><dt className="font-semibold text-gray-900">{faq.question}</dt><dd className="mt-2 leading-relaxed text-gray-700">{faq.answer}</dd></div>)}
              </dl>
            </section>
          ))}
          <nav aria-label="More about CleanApp" className="mt-12 flex flex-wrap gap-6 font-semibold text-green-800">
            <Link href="/report-a-problem" className="hover:underline underline-offset-4">Report a problem →</Link>
            <Link href="/pricing" className="hover:underline underline-offset-4">Organization plans →</Link>
            <Link href="/company" className="hover:underline underline-offset-4">Company & investors →</Link>
            <Link href="/privacy" className="hover:underline underline-offset-4">Privacy policy →</Link>
          </nav>
        </article>
        <Footer />
      </div>
    </>
  );
}
