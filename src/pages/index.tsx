import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import GlobeView from "../components/GlobeView";
import { getCanonicalReportPath } from "@/lib/report-links";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const publicId =
      typeof router.query.public_id === "string"
        ? router.query.public_id
        : null;
    const seq =
      typeof router.query.seq === "string" ? router.query.seq.trim() : null;
    const tab =
      router.query.tab === "digital"
        ? "digital"
        : router.query.tab === "physical"
          ? "physical"
          : null;

    if (publicId) {
      if (tab) {
        const target = getCanonicalReportPath(tab, publicId);
        if (target) {
          router.replace(target);
        }
        return;
      }

      let cancelled = false;
      void fetch(
        `/api/reports/by-public-id?public_id=${encodeURIComponent(publicId)}`,
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to resolve report: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (cancelled) {
            return;
          }
          const classification =
            data?.analysis?.[0]?.classification === "digital"
              ? "digital"
              : "physical";
          const resolvedPublicId = data?.report?.public_id || publicId;
          const target = getCanonicalReportPath(
            classification,
            resolvedPublicId,
          );
          if (target) {
            router.replace(target);
          }
        })
        .catch(() => {
          // Leave the map route alone if resolution fails.
        });
      return () => {
        cancelled = true;
      };
    }

    if (seq) {
      let cancelled = false;
      void fetch(`/api/reports/by-seq?seq=${encodeURIComponent(seq)}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to resolve report: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (cancelled) {
            return;
          }
          const classification =
            data?.analysis?.[0]?.classification === "digital"
              ? "digital"
              : "physical";
          const resolvedPublicId = data?.report?.public_id;
          const target = getCanonicalReportPath(
            classification,
            resolvedPublicId,
          );
          if (target) {
            router.replace(target);
          }
        })
        .catch(() => {
          // Keep the legacy route if resolution fails.
        });
      return () => {
        cancelled = true;
      };
    }

    // Redirect to /?tab=physical when user visits root path without query params
    if (!router.query.tab) {
      router.replace({ pathname: "/", query: { tab: "physical" } }, undefined, {
        shallow: true,
      });
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>CleanApp - Trash is cash</title>
        <meta
          name="description"
          content="The world's easiest & most rewarding feedback tool. With just 1-click, CleanApp turns complaints & feature requests into massive opportunities for brands, property owners, and cities. Users get paid to spot glitches in the matrix & train AI. Firms subscribe to lower risk & boost profits. Win-win-win."
        />

        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="CleanApp - Trash is cash" />
        <meta
          property="og:description"
          content="The world's easiest & most rewarding feedback tool. With just 1-click, CleanApp turns complaints & feature requests into massive opportunities for brands, property owners, and cities. Users get paid to spot glitches in the matrix & train AI. Firms subscribe to lower risk & boost profits. Win-win-win."
        />
        <meta
          property="og:image"
          content="https://cleanapp.io/cleanapp-social-card.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:url" content="https://cleanapp.io" />
        <meta property="og:type" content="website" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CleanApp - Trash is cash" />
        <meta
          name="twitter:description"
          content="CleanApp is ground truth for AI. CleanApp turns photos of physical hazards and digital bugs into live maps and risk insights for brands, property owners, and cities. Get paid to spot glitches in the matrix."
        />
        <meta
          name="twitter:image"
          content="https://cleanapp.io/cleanapp-social-card.png"
        />

        {/* Telegram Specific Meta Tags */}
        <meta name="telegram:channel" content="@cleanapp" />
        <meta name="telegram:site" content="@cleanapp" />
      </Head>
      <GlobeView />
    </>
  );
}
