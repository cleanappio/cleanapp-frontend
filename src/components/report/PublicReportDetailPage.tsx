"use client";

import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import type { ReportWithAnalysis } from "@/components/GlobeView";
import ImageDisplay from "@/components/ImageDisplay";
import ReportContactStrategyPanel, {
  ReportContactStrategyResponse,
} from "@/components/report/ReportContactStrategyPanel";
import { getDisplayableImage } from "@/lib/image-utils";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { getCanonicalReportPath } from "@/lib/report-links";
import { getBrandNameDisplay } from "@/lib/util";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type Props = {
  expectedClassification: "physical" | "digital";
  publicId?: string;
  presentation?: "page" | "embedded";
  onBack?: () => void;
};

export function EmbeddedReportBackBar({ onBack }: { onBack: () => void }) {
  const { t } = useTranslations();

  return (
    <div className="sticky top-0 z-50 flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {t("backToMap")}
      </button>
      <button
        type="button"
        onClick={onBack}
        aria-label={t("close")}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <X className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function PublicReportDetailPage({
  expectedClassification,
  publicId: suppliedPublicId,
  presentation = "page",
  onBack,
}: Props) {
  const router = useRouter();
  const publicId =
    suppliedPublicId ??
    (typeof router.query.public_id === "string"
      ? router.query.public_id
      : null);
  const isReady = suppliedPublicId !== undefined || router.isReady;
  const asPath = router.asPath;
  const locale = getCurrentLocale();
  const { t } = useTranslations();
  const [isNativeWebView, setIsNativeWebView] = useState(false);
  const isEmbedded =
    presentation === "embedded" ||
    process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true" ||
    isNativeWebView;

  useEffect(() => {
    setIsNativeWebView(Boolean(window.ReactNativeWebView));
  }, []);

  const [report, setReport] = useState<ReportWithAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactStrategy, setContactStrategy] =
    useState<ReportContactStrategyResponse | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

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
          `/api/reports/by-public-id?public_id=${encodeURIComponent(publicId)}`,
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
          data.report.public_id || publicId,
        );

        if (
          !isEmbedded &&
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
            err instanceof Error ? err.message : t("failedToFetchReport"),
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
  }, [
    asPath,
    expectedClassification,
    isEmbedded,
    isReady,
    publicId,
    router,
    t,
  ]);

  const matchingAnalysis = useMemo(() => {
    if (!report?.analysis?.length) {
      return null;
    }
    return (
      report.analysis.find((item) => item.language === locale) ||
      report.analysis[0]
    );
  }, [locale, report]);

  const imageUrl = getDisplayableImage(report?.report?.image || null);
  const brandDisplay = matchingAnalysis
    ? getBrandNameDisplay(matchingAnalysis).brandDisplayName
    : "";

  useEffect(() => {
    if (!isReady || !publicId || !report?.report?.public_id) {
      return;
    }

    const resolvedPublicId = report.report.public_id || publicId;
    let cancelled = false;

    const loadContacts = async () => {
      setContactsLoading(true);
      setContactsError(null);
      setContactStrategy(null);
      try {
        const response = await fetch(
          `/api/reports/contact-strategy?public_id=${encodeURIComponent(resolvedPublicId)}`,
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = (await response.json()) as ReportContactStrategyResponse;
        if (!cancelled) {
          setContactStrategy(data);
        }
      } catch (err) {
        if (!cancelled) {
          setContactsError(
            err instanceof Error
              ? err.message
              : "Failed to load responsible parties",
          );
        }
      } finally {
        if (!cancelled) {
          setContactsLoading(false);
        }
      }
    };

    loadContacts();

    return () => {
      cancelled = true;
    };
  }, [isReady, publicId, report?.report?.public_id]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    void router.push({
      pathname: "/",
      query: {
        tab: report?.analysis?.[0]?.classification || expectedClassification,
      },
    });
  };

  const renderPage = (content: ReactNode, showFooter = false) => (
    <div className={`bg-gray-50 ${isEmbedded ? "min-h-full" : "min-h-screen"}`}>
      {isEmbedded ? (
        suppliedPublicId === undefined ? (
          <EmbeddedReportBackBar onBack={handleBack} />
        ) : null
      ) : (
        <PageHeader />
      )}
      <div
        className={`mx-auto max-w-4xl ${isEmbedded ? "px-4 py-5 sm:px-6" : "my-8 px-6"}`}
      >
        {content}
      </div>
      {!isEmbedded && showFooter && <Footer />}
    </div>
  );

  if (isLoading) {
    return renderPage(
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
        <p className="text-gray-500">{t("loading")}...</p>
      </div>,
    );
  }

  if (error || !report) {
    return renderPage(
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <h1 className="text-xl font-semibold text-red-600 mb-2">
          {error || "Report not found"}
        </h1>
        <button
          onClick={isEmbedded ? handleBack : () => router.push("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          {t("goBack")}
        </button>
      </div>,
    );
  }

  const classification =
    matchingAnalysis?.classification || expectedClassification;

  return renderPage(
    <>
      {!isEmbedded && (
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
      )}

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

      <ReportContactStrategyPanel
        strategy={contactStrategy}
        loading={contactsLoading}
        error={contactsError}
      />

      {!isEmbedded && (
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            {t("goBack")}
          </button>
          {classification === "digital" && matchingAnalysis?.brand_name ? (
            <button
              onClick={() =>
                router.push(`/digital/${matchingAnalysis.brand_name}`)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
            >
              View Brand Reports
            </button>
          ) : null}
        </div>
      )}
    </>,
    true,
  );
}
