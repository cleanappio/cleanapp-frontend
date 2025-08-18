"use client";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { useReportsByBrand } from "@/hooks/useReportsByBrand";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { useRouter } from "next/router";
import { getBrandNameDisplay } from "@/lib/util";
import { ReportAnalysis, ReportWithAnalysis } from "../../components/GlobeView";
import PublicBrandDashboard from "@/components/brand/PublicBrandDashboard";
import { useEffect, useState } from "react";
import SubscribedBrandDashboard from "@/components/brand/SubscribedBrandDashboard";
import AIInsights from "@/components/AIInsights";
import { useAuthStore } from "@/lib/auth-store";

export default function DigitalBrandPage() {
  const router = useRouter();
  const { brand_name } = router.query;
  const locale = getCurrentLocale();
  // Only subscribe to the specific auth state properties we need
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const { t } = useTranslations();

  const [isSubscribed, setIsSubscribed] = useState(false);

  const { brandReports, isLoading, error, fetchRecentReportsByBrand } =
    useReportsByBrand(brand_name as string, locale);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      setIsSubscribed(true);
    } else {
      setIsSubscribed(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  if (isLoading || isAuthLoading) {
    return (
      <div className="max-w-7xl mx-auto my-6 sm:my-8">
        <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">
          {t("recentReports")}
        </h1>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mr-3 sm:mr-3"></div>
            <p className="text-gray-500 text-sm sm:text-base">
              {t("loading")} {t("recentReports").toLowerCase()}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto my-6 sm:my-8">
        <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">
          {t("recentReports")}
        </h1>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="text-center">
            <div className="text-red-400 text-3xl sm:text-4xl mb-2">⚠️</div>
            <p className="text-red-600 font-medium text-sm sm:text-base">
              {t("failedToFetchReport")}
            </p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={() => fetchRecentReportsByBrand(brand_name as string)}
              className="mt-4 sm:mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-4 sm:py-2 rounded-md transition-colors text-sm"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getAnalysis = (
    brandReports: ReportWithAnalysis[]
  ): ReportAnalysis | undefined => {
    if (brandReports.length === 0) {
      return undefined;
    }
    return (
      brandReports[0].analysis.find((a) => a.language === locale) ||
      brandReports[0].analysis[0]
    );
  };

  return (
    <div className="bg-gray-50">
      <PageHeader />
      <div className="max-w-7xl mx-auto my-6 sm:my-8 px-6 md:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-4">
          {getAnalysis(brandReports) &&
            getBrandNameDisplay(getAnalysis(brandReports)!).brandDisplayName}
        </h1>
        <h2 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4">
          {t("recentReports")} ({brandReports.length})
        </h2>

        {isSubscribed && (
          <SubscribedBrandDashboard brandReports={brandReports} />
        )}
        {!isSubscribed && <PublicBrandDashboard brandReports={brandReports} />}
        <AIInsights brandReports={brandReports} />
      </div>

      <Footer />
    </div>
  );
}
