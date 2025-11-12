"use client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ReportWithAnalysis } from "@/components/GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { getBrandNameDisplay } from "@/lib/util";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import ImageDisplay from "@/components/ImageDisplay";

export default function ReportDetailPage() {
  const router = useRouter();
  const { brand_name, report_seq } = router.query;
  const locale = getCurrentLocale();
  const { t } = useTranslations();

  const [report, setReport] = useState<ReportWithAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brand_name && report_seq) {
      fetchReportDetails(report_seq as string);
    }
  }, [brand_name, report_seq]);

  const fetchReportDetails = async (reportSeq: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/by-seq?seq=${reportSeq}`);
      const data = await response.json();
      setReport(data);
    } catch (error) {
      setError("Failed to fetch report details");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <PageHeader />
        <div className="max-w-4xl mx-auto my-8 px-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
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
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-red-600 mb-2">
              {error || "Report not found"}
            </h1>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const reportData = report.report;
  const analysis = report.analysis;
  const matchingAnalysis =
    analysis.find((a) => a.language === locale) || analysis[0];

  const imageUrl = getDisplayableImage(reportData?.image || null);
  const { brandDisplayName } = getBrandNameDisplay(matchingAnalysis);

  return (
    <div className="bg-gray-50 min-h-screen">
      <PageHeader />
      <div className="max-w-4xl mx-auto my-8 px-6">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <span>Digital</span>
            </li>
            <li>/</li>
            <li>
              <Link href={`/digital/${brand_name}`}>
                <button className="hover:text-blue-600 transition-colors">
                  {brandDisplayName}
                </button>
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-700 font-medium">Report {report_seq}</li>
          </ol>
        </nav>

        {/* Report Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {matchingAnalysis?.title || `Report ${report_seq}`}
                </h1>
                <p className="text-gray-600">
                  {brandDisplayName} • {t("reported")}:{" "}
                  {reportData?.timestamp
                    ? new Date(reportData.timestamp).toLocaleString()
                    : t("unknown")}
                </p>
              </div>
              <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">
                {matchingAnalysis?.brand_display_name?.toUpperCase()}
              </span>
            </div>

            {/* Report Image */}
            {imageUrl && (
              <div className="mb-6">
                <ImageDisplay imageUrl={imageUrl} />
              </div>
            )}

            {/* Report Summary */}
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

            {/* Report Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">
                  Location
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Coordinates:</span>{" "}
                    {reportData?.latitude?.toFixed(6)},{" "}
                    {reportData?.longitude?.toFixed(6)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">
                  Analysis
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {matchingAnalysis?.severity_level && (
                    <p>
                      <span className="font-medium">Severity:</span>{" "}
                      {(matchingAnalysis.severity_level * 100).toFixed(0)}%
                    </p>
                  )}
                  {matchingAnalysis?.classification && (
                    <p>
                      <span className="font-medium">Type:</span>{" "}
                      {matchingAnalysis.classification}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push(`/digital/${brand_name}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            View All Reports
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
