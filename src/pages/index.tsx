import { useEffect } from "react";
import { useRouter } from "next/router";
import Seo from "@/components/Seo";
import HomeSeoSection from "@/components/HomeSeoSection";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  jsonLdGraph,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
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
      <Seo
        title={DEFAULT_TITLE}
        description={DEFAULT_DESCRIPTION}
        path="/"
        jsonLd={jsonLdGraph([
          organizationJsonLd(),
          websiteJsonLd(),
          softwareApplicationJsonLd(),
        ])}
      />
      <GlobeView />
      <HomeSeoSection />
    </>
  );
}
