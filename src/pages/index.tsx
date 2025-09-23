import GlobeView from "../components/GlobeView";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>CleanApp - Real-time Environmental Monitoring</title>
        <meta name="description" content="Track environmental issues in real-time. Monitor litter, hazards, and digital pollution with AI-powered insights and live data alerts." />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="CleanApp - Real-time Environmental Monitoring" />
        <meta property="og:description" content="Track environmental issues in real-time. Monitor litter, hazards, and digital pollution with AI-powered insights and live data alerts." />
        <meta property="og:image" content="/cleanapp-logo-high-res.png" />
        <meta property="og:url" content="https://cleanapp.io" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CleanApp - Real-time Environmental Monitoring" />
        <meta name="twitter:description" content="Track environmental issues in real-time. Monitor litter, hazards, and digital pollution with AI-powered insights and live data alerts." />
        <meta name="twitter:image" content="/cleanapp-logo-high-res.png" />
      </Head>
      <GlobeView />
    </>
  );
}
