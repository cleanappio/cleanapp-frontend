import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import GlobeView from "../components/GlobeView";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /?tab=physical when user visits root path without query params
    if (!router.query.tab && router.isReady) {
      router.replace({ pathname: "/", query: { tab: "physical" } }, undefined, {
        shallow: true,
      });
    }
  }, [router.isReady, router.query.tab, router]);

  return (
    <>
      <Head>
        <title>CleanApp - Trash is cash</title>
        <meta
          name="description"
          content="The world's easiest & most rewarding feedback tool. With just 1-click, CleanApp turns complaints & feature requests into massive opportunities for brands, property owners, and cities. Users get paid to spot glitches in the matrix & train AI. Firms subscribe to lower risk & boost profits. Win-win-win."
        />

        {/* Open Graph Meta Tags */}
        <meta
          property="og:title"
          content="CleanApp - Trash is cash"
        />
        <meta
          property="og:description"
          content="The world's easiest & most rewarding feedback tool. With just 1-click, CleanApp turns complaints & feature requests into massive opportunities for brands, property owners, and cities. Users get paid to spot glitches in the matrix & train AI. Firms subscribe to lower risk & boost profits. Win-win-win."
        />
        <meta property="og:image" content="https://cleanapp.io/cleanapp-social-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:url" content="https://cleanapp.io" />
        <meta property="og:type" content="website" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="CleanApp - Trash is cash"
        />
        <meta
          name="twitter:description"
          content="CleanApp is ground truth for AI. CleanApp turns photos of physical hazards and digital bugs into live maps and risk insights for brands, property owners, and cities. Get paid to spot glitches in the matrix."
        />
        <meta name="twitter:image" content="https://cleanapp.io/cleanapp-social-card.png" />

        {/* Telegram Specific Meta Tags */}
        <meta name="telegram:channel" content="@cleanapp" />
        <meta name="telegram:site" content="@cleanapp" />
      </Head>
      <GlobeView />
    </>
  );
}
