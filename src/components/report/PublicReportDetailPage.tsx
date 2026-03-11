"use client";

import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { ReportWithAnalysis } from "@/components/GlobeView";
import ImageDisplay from "@/components/ImageDisplay";
import { getDisplayableImage } from "@/lib/image-utils";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { getCanonicalReportPath } from "@/lib/report-links";
import { getBrandNameDisplay } from "@/lib/util";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type Props = {
  expectedClassification: "physical" | "digital";
};

export default function PublicReportDetailPage({
  expectedClassification,
}: Props) {
  const router = useRouter();
  const publicId =
    typeof router.query.public_id === "string" ? router.query.public_id : null;
  const isReady = router.isReady;
  const asPath = router.asPath;
  const locale = getCurrentLocale();
  const { t } = useTranslations();

  const [report, setReport] = useState<ReportWithAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !publicId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reports/by-public-id?public_id=${encodeURIComponent(publicId)}`
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as ReportWithAnalysis;
        if (cancelled) {
          return;
        }

        const actualClassification =
          data.analysis?.[0]?.classification || expectedClassification;
        const canonicalPath = getCanonicalReportPath(
          actualClassification,
          data.report.public_id || publicId
        );

        if (
          canonicalPath &&
          actualClassification !== expectedClassification &&
          asPath !== canonicalPath
        ) {
          void router.replace(canonicalPath);
          return;
        }

        setReport(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("failedToFetchReport")
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [asPath, expectedClassification, isReady, publicId, router, t]);

  const matchingAnalysis = useMemo(() => {
    if (!report?.analysis?.length) {
      return null;
    }
    return (
      report.analysis.find((item) => item.language === locale) || report.analysis[0]
    );
  }, [locale, report]);

  const imageUrl = getDisplayableImage(report?.report?.image || null);
  const brandDisplay = matchingAnalysis
    ? getBrandNameDisplay(matchingAnalysis).brandDisplayName
    : "";

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <PageHeader />
        <div className="max-w-4xl mx-auto my-8 px-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
            <p className="text-gray-500">{t("loading")}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <PageHeader />
        <div className="max-w-4xl mx-auto my-8 px-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <h1 className="text-xl font-semibold text-red-600 mb-2">
              {error || "Report not found"}
            </h1>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              {t("goBack")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const classification =
    matchingAnalysis?.classification || expectedClassification;

  return (
    <div className="bg-gray-50 min-h-screen">
      <PageHeader />
      <div className="max-w-4xl mx-auto my-8 px-6">
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600 transition-colors">
                CleanApp
              </Link>
            </li>
            <li>/</li>
            <li className="capitalize">{classification}</li>
            {classification === "digital" && matchingAnalysis?.brand_name ? (
              <>
                <li>/</li>
                <li>
                  <Link
                    href={`/digital/${matchingAnalysis.brand_name}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {brandDisplay}
                  </Link>
                </li>
              </>
            ) : null}
            <li>/</li>
            <li className="text-gray-700 font-medium">
              {report.report.public_id || publicId}
            </li>
          </ol>
        </nav>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {matchingAnalysis?.title ||
                    `${t("report")} ${report.report.public_id || publicId}`}
                </h1>
                <p className="text-gray-600">
                  {classification === "digital" && brandDisplay
                    ? `${brandDisplay} • `
                    : ""}
                  {t("reported")}:{" "}
                  {report.report.timestamp
                    ? new Date(report.report.timestamp).toLocaleString()
                    : t("unknown")}
                </p>
              </div>
              <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium uppercase">
                {classification}
              </span>
            </div>

            {imageUrl ? (
              <div className="mb-6">
                <ImageDisplay imageUrl={imageUrl} />
              </div>
            ) : null}

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Summary
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {matchingAnalysis?.summary ||
                  matchingAnalysis?.description ||
                  t("noDescriptionAvailable")}
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {matchingAnalysis?.severity_level !== undefined ? (
                <p>
                  <span className="font-medium">Severity:</span>{" "}
                  {(matchingAnalysis.severity_level * 100).toFixed(0)}%
                </p>
              ) : null}
              <p>
                <span className="font-medium">Public ID:</span>{" "}
                {report.report.public_id}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            {t("goBack")}
          </button>
          {classification === "digital" && matchingAnalysis?.brand_name ? (
            <button
              onClick={() => router.push(`/digital/${matchingAnalysis.brand_name}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
            >
              View Brand Reports
            </button>
          ) : null}
        </div>
      </div>
      <Footer />
    </div>
  );
}
