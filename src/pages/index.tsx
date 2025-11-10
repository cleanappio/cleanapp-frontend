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
        <title>CleanApp - Real-time Environmental Monitoring</title>
        <meta
          name="description"
          content="Track environmental issues in real-time. Monitor litter, hazards, and digital pollution with AI-powered insights and live data alerts."
        />

        {/* Open Graph Meta Tags */}
        <meta
          property="og:title"
          content="CleanApp - Real-time Environmental Monitoring"
        />
        <meta
          property="og:description"
          content="Track environmental issues in real-time. Monitor litter, hazards, and digital pollution with AI-powered insights and live data alerts."
        />
        <meta
          property="og:image"
          content="https://cleanapp.io/cleanapp-logo-high-res.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:url" content="https://cleanapp.io" />
        <meta property="og:type" content="website" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="CleanApp - Real-time Environmental Monitoring"
        />
        <meta
          name="twitter:description"
          content="Track environmental issues in real-time. Monitor litter, hazards, and digital pollution with AI-powered insights and live data alerts."
        />
        <meta
          name="twitter:image"
          content="https://cleanapp.io/cleanapp-logo-high-res.png"
        />

        {/* Telegram Specific Meta Tags */}
        <meta name="telegram:channel" content="@cleanapp" />
        <meta name="telegram:site" content="@cleanapp" />
      </Head>
      <GlobeView />
    </>
  );
}
