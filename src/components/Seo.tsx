import Head from "next/head";
import { useRouter } from "next/router";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  TWITTER_HANDLE,
  absoluteUrl,
} from "@/lib/seo";

type SeoProps = {
  title?: string;
  description?: string;
  /** Site-relative path used for canonical/og:url. Defaults to the current route. */
  path?: string;
  image?: string;
  noindex?: boolean;
  /** One or more JSON-LD documents, rendered as <script type="application/ld+json">. */
  jsonLd?: object | object[];
};

/**
 * Per-page SEO head. Every tag carries a `key` so a page's <Seo> overrides the
 * defaults rendered from _app.tsx instead of duplicating them.
 */
export default function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd,
}: SeoProps) {
  const router = useRouter();
  // Strip query/hash so "/?tab=physical" canonicalizes to "/".
  const routePath = (path ?? router.asPath ?? "/").split(/[?#]/)[0] || "/";
  const canonical = absoluteUrl(routePath);
  const jsonLdDocs = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <meta
        key="robots"
        name="robots"
        content={
          noindex
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        }
      />
      <link key="canonical" rel="canonical" href={canonical} />
      <link key="alt-en" rel="alternate" hrefLang="en" href={canonical} />
      <link
        key="alt-me"
        rel="alternate"
        hrefLang="cnr"
        href={absoluteUrl(`/me${routePath === "/" ? "" : routePath}`)}
      />
      <link key="alt-default" rel="alternate" hrefLang="x-default" href={canonical} />

      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:locale" property="og:locale" content="en_US" />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:url" property="og:url" content={canonical} />
      <meta key="og:image" property="og:image" content={image} />
      <meta key="og:image:width" property="og:image:width" content="1200" />
      <meta key="og:image:height" property="og:image:height" content="630" />
      <meta key="og:image:alt" property="og:image:alt" content={title} />

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:site" name="twitter:site" content={TWITTER_HANDLE} />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={image} />

      {jsonLdDocs.map((doc, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(doc) }}
        />
      ))}
    </Head>
  );
}
