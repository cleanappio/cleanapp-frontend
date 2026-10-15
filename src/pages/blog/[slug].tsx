import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { ARTICLES, getArticle, type Article } from "@/content/articles";
import { ORGANIZATION_ID, SITE_URL, absoluteUrl, breadcrumbJsonLd, jsonLdGraph } from "@/lib/seo";

type Props = { article: Article };

export default function ArticlePage({ article }: Props) {
  const path = `/blog/${article.slug}`;
  const articleJsonLd = {
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    image: `${SITE_URL}/cleanapp-social-card.png`,
    mainEntityOfPage: absoluteUrl(path),
  };

  return (
    <>
      <Seo
        title={`${article.title} | CleanApp`}
        description={article.description}
        path={path}
        jsonLd={jsonLdGraph([
          articleJsonLd,
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: article.title, path },
          ]),
        ])}
      />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:text-green-700">Blog</Link>
          </nav>
          <p className="mt-6 text-sm text-gray-500">
            {new Date(article.datePublished).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {" · "}
            {article.readingMinutes} min read
          </p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900 leading-tight">{article.title}</h1>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed">{article.lead}</p>

          {article.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-gray-700 leading-relaxed">{paragraph}</p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-2 list-disc pl-6 text-gray-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900">See what people are reporting about your brand and places</h2>
            <p className="mt-2 text-gray-700">
              CleanApp is free to report with and starts at $99/month for organizations.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/pricing" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-md font-medium">See plans</Link>
              <Link href="/download" className="border border-gray-300 hover:border-gray-500 text-gray-800 px-5 py-2.5 rounded-md font-medium">Get the app</Link>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900">Related</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {article.related.map((href) => (
                <li key={href}>
                  <Link href={href} className="inline-block border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-800 hover:border-green-600 hover:text-green-700">
                    {href.replace(/^\//, "").replace(/-/g, " ").replace("solutions/", "for ")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </article>
        <Footer />
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: ARTICLES.map((article) => ({ params: { slug: article.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const article = getArticle(String(params?.slug));
  if (!article) return { notFound: true };
  return { props: { article } };
};
