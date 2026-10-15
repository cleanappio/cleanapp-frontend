import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { ARTICLES } from "@/content/articles";
import { breadcrumbJsonLd, jsonLdGraph, webPageJsonLd } from "@/lib/seo";

const TITLE = "CleanApp Blog – Incident, Hazard & Bug Reporting Guides";
const DESCRIPTION =
  "Guides and comparisons on incident reporting, hazard reporting and bug reporting apps, from the team behind CleanApp.";

export default function BlogIndex() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path="/blog"
        jsonLd={jsonLdGraph([
          webPageJsonLd({ path: "/blog", title: TITLE, description: DESCRIPTION }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ])}
      />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Blog</p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">Guides and comparisons</h1>
          <p className="mt-4 text-lg text-gray-600">
            How to choose reporting tools for brands, places and products, written plainly.
          </p>
          <ul className="mt-10 divide-y divide-gray-200">
            {ARTICLES.map((article) => (
              <li key={article.slug} className="py-8">
                <p className="text-sm text-gray-500">
                  {new Date(article.datePublished).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  {" · "}
                  {article.readingMinutes} min read
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">
                  <Link href={`/blog/${article.slug}`} className="hover:text-green-700">
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-3 text-gray-700 leading-relaxed">{article.description}</p>
                <Link href={`/blog/${article.slug}`} className="mt-3 inline-block text-green-700 font-medium hover:underline">
                  Read the guide
                </Link>
              </li>
            ))}
          </ul>
        </main>
        <Footer />
      </div>
    </>
  );
}
