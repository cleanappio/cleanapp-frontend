import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Page-level metadata (title, description, canonical, Open Graph, Twitter,
 * robots, JSON-LD) lives in <Seo /> (src/components/Seo.tsx), rendered with
 * site defaults from _app.tsx and overridden per page. Only truly global,
 * route-independent tags belong here.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon and App Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="author" content="CleanApp" />

        {/* Telegram Specific Meta Tags */}
        <meta name="telegram:channel" content="@cleanapp" />
        <meta name="telegram:site" content="@cleanapp" />

        {/* Additional Meta Tags for Better Compatibility */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CleanApp" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
