import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { ReportResponse } from "@/types/reports/api";
import {
  fetchPublicBrandReports,
  fetchPublicLatest,
  fetchPublicNearbyReports,
  resolvePublicDiscoveryToken,
} from "@/lib/public-discovery-api";
import { PublicDiscoveryCard } from "@/types/public-discovery";
import LocationsCard from "./RecentReports/LocationsCard";
import AIInsightsCard from "./RecentReports/AIInsightsCard";

interface RecentReportsProps {
  reportItem?: ReportResponse | null;
}

const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

function RecentReportsStatsCard({
  items,
}: {
  items: PublicDiscoveryCard[];
}) {
  const { t } = useTranslations();

  const stats = useMemo(() => {
    const highPriority = items.filter((item) => item.severity_level >= 0.7).length;
    const mediumPriority = items.filter(
      (item) => item.severity_level >= 0.4 && item.severity_level < 0.7,
    ).length;
    return { highPriority, mediumPriority };
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-base sm:text-lg font-medium text-white">
          {t("statistics")}
        </h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {items.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              {t("totalReports")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-base sm:text-lg font-semibold text-red-600">
                {stats.highPriority}
              </div>
              <div className="text-xs text-gray-500">{t("highPriority")}</div>
            </div>
            <div className="text-center">
              <div className="text-base sm:text-lg font-semibold text-yellow-600">
                {stats.mediumPriority}
              </div>
              <div className="text-xs text-gray-500">{t("mediumPriority")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicRecentReportCard({
  item,
  blurred,
  onOpen,
}: {
  item: PublicDiscoveryCard;
  blurred?: boolean;
  onOpen: (item: PublicDiscoveryCard) => void;
}) {
  const { t } = useTranslations();

  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
      {blurred && !isEmbeddedMode && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-white text-sm font-medium mb-3">
              {t("upgradeToPro")}
            </p>
            <button
              className="bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm"
              onClick={() => onOpen(item)}
            >
              {t("readReport") || "Read report"}
            </button>
          </div>
        </div>
      )}

      <div className={`p-4 flex-1 flex flex-col ${blurred && !isEmbeddedMode ? "blur-[2px]" : ""}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-base sm:text-lg mb-1">
              {item.title || t("report")}
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">
              {item.timestamp
                ? new Date(item.timestamp).toLocaleString()
                : t("unknown")}
            </p>
          </div>
          <span
            className={`text-white text-xs font-semibold px-3 py-1 rounded-full ${
              item.severity_level >= 0.7
                ? "bg-red-500"
                : item.severity_level >= 0.4
                  ? "bg-yellow-500"
                  : "bg-green-500"
            }`}
          >
            {item.severity_level >= 0.7
              ? t("highPriority")
              : item.severity_level >= 0.4
                ? t("mediumPriority")
                : t("lowPriority")}
          </span>
        </div>

        <p className="text-gray-700 text-sm leading-6 line-clamp-4 flex-1">
          {item.summary || t("noDescriptionAvailable")}
        </p>

        <div className="flex items-center justify-between mt-4">
          <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
            {(item.brand_display_name || item.brand_name || item.classification).toUpperCase()}
          </span>
          {item.classification === "physical" &&
            item.latitude !== undefined &&
            item.longitude !== undefined && (
              <span className="text-xs text-gray-500">
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </span>
            )}
        </div>

        {!blurred && (
          <button
            className="mt-4 bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm"
            onClick={() => onOpen(item)}
          >
            {t("readReport") || "Read report"}
          </button>
        )}
      </div>
    </div>
  );
}

const RecentReports: React.FC<RecentReportsProps> = ({ reportItem }) => {
  const [recentReports, setRecentReports] = useState<PublicDiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();
  const locale = getCurrentLocale();
  const router = useRouter();

  const reportItemKey = reportItem
    ? reportItem.classification === "digital"
      ? `digital_${reportItem.brand_name}`
      : `physical_${reportItem.latitude?.toFixed(4)}_${reportItem.longitude?.toFixed(4)}`
    : "default";

  const loadRecentReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (
        reportItem &&
        reportItem.classification === "digital" &&
        reportItem.brand_name
      ) {
        const batch = await fetchPublicBrandReports(reportItem.brand_name, locale, 10);
        setRecentReports(batch.items || []);
        return;
      }

      if (
        reportItem &&
        reportItem.classification === "physical" &&
        reportItem.latitude !== undefined &&
        reportItem.longitude !== undefined
      ) {
        const batch = await fetchPublicNearbyReports(
          reportItem.latitude,
          reportItem.longitude,
          locale,
          0.5,
          10,
        );
        setRecentReports(batch.items || []);
        return;
      }

      const fallbackClassification =
        reportItem?.classification === "digital" ? "digital" : "physical";
      const batch = await fetchPublicLatest(fallbackClassification, locale, 10);
      setRecentReports(batch.items || []);
    } catch (err) {
      console.error("Error fetching recent reports:", err);
      setRecentReports([]);
      setError(err instanceof Error ? err.message : t("failedToFetchReports"));
    } finally {
      setLoading(false);
    }
  }, [locale, reportItem, t]);

  useEffect(() => {
    void loadRecentReports();
  }, [loadRecentReports, reportItemKey]);

  const openItem = useCallback(
    async (item: PublicDiscoveryCard) => {
      try {
        const resolved = await resolvePublicDiscoveryToken(item.discovery_token);
        if (resolved.canonical_path) {
          await router.push(resolved.canonical_path);
        }
      } catch (err) {
        console.error("Failed to resolve public discovery token:", err);
      }
    },
    [router],
  );

  if (loading) {
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
              onClick={() => {
                void loadRecentReports();
              }}
              className="mt-4 sm:mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-4 sm:py-2 rounded-md transition-colors text-sm"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visibleReports = recentReports.slice(0, 6);
  const firstRow = visibleReports.slice(0, 3);
  const secondRow = visibleReports.slice(3, 6);

  return (
    <div className="max-w-7xl mx-auto my-6 sm:my-8">
      <h1 className="text-lg sm:text-2xl font-medium mb-4 sm:mb-4 text-white">
        {t("recentReports")}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {firstRow.map((item) => (
          <PublicRecentReportCard
            key={item.discovery_token}
            item={item}
            onOpen={(nextItem) => {
              void openItem(nextItem);
            }}
          />
        ))}
        {secondRow.map((item) => (
          <PublicRecentReportCard
            key={item.discovery_token}
            item={item}
            blurred={!isEmbeddedMode}
            onOpen={(nextItem) => {
              void openItem(nextItem);
            }}
          />
        ))}
      </div>

      {recentReports.length > 6 && (
        <div className="text-center bg-white mt-8 p-4 rounded-md">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-row items-center justify-center gap-1">
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm">
              {t("moreReports")}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <LocationsCard totalReports={recentReports.length} />
        <RecentReportsStatsCard items={recentReports} />
        <AIInsightsCard />
      </div>
    </div>
  );
};

export default RecentReports;
