import { Html, Head, Main, NextScript } from 'next/document'

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

        {/* Basic Meta Tags */}
        <meta name="description" content="The world's easiest & most rewarding feedback tool. With just 1-click, CleanApp turns complaints & feature requests into massive opportunities for brands, property owners, and cities. Users get paid to spot glitches in the matrix & train AI. Firms subscribe to lower risk & boost profits. Win-win-win." />
        <meta name="keywords" content="environmental monitoring, litter tracking, pollution detection, AI insights, real-time data, CleanApp, ground truth, physical hazards, digital bugs" />
        <meta name="author" content="CleanApp" />

        {/* Open Graph Meta Tags (Facebook, LinkedIn, WhatsApp, etc.) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="CleanApp - Trash is cash" />
        <meta property="og:description" content="The world's easiest & most rewarding feedback tool. With just 1-click, CleanApp turns complaints & feature requests into massive opportunities for brands, property owners, and cities. Users get paid to spot glitches in the matrix & train AI. Firms subscribe to lower risk & boost profits. Win-win-win." />
        <meta property="og:image" content="https://cleanapp.io/cleanapp-social-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="CleanApp - Trash is Cash" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:url" content="https://cleanapp.io" />
        <meta property="og:site_name" content="CleanApp" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@cleanapp" />
        <meta name="twitter:creator" content="@cleanapp" />
        <meta name="twitter:title" content="CleanApp - Trash is cash" />
        <meta name="twitter:description" content="CleanApp is ground truth for AI. CleanApp turns photos of physical hazards and digital bugs into live maps and risk insights for brands, property owners, and cities. Get paid to spot glitches in the matrix." />
        <meta name="twitter:image" content="https://cleanapp.io/cleanapp-social-card.png" />
        <meta name="twitter:image:alt" content="CleanApp - Trash is Cash" />

        {/* Telegram Specific Meta Tags */}
        <meta name="telegram:channel" content="@cleanapp" />
        <meta name="telegram:site" content="@cleanapp" />

        {/* Additional Meta Tags for Better Compatibility */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CleanApp" />

        {/* Additional Meta Tags for Better SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://cleanapp.io" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
