import React from "react";
import { useRouter } from "next/router";
import { FaLock } from "react-icons/fa";
import { useTranslations } from "@/lib/i18n";

const isEmbeddedMode = process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true";

const AIInsightsCard: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-base sm:text-lg font-medium text-white">{t("aiInsights")}</h1>
      </div>
      <div className="bg-white rounded-xl shadow-dashed border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 sm:p-6 h-full">
        <div className="flex flex-col items-center">
          <div className="bg-green-100 rounded-full p-3 sm:p-4 mb-3 sm:mb-4">
            <FaLock className="text-green-600 text-xl sm:text-2xl" />
          </div>
          <h2 className="font-semibold text-base sm:text-lg mb-2">
            {t("premiumFeatures")}
          </h2>
          <ul className="text-gray-700 text-xs mb-3 sm:mb-4 list-none space-y-1 text-center">
            <li>
              <span className="text-green-600 mr-2">&#10003;</span>{" "}
              {t("predictiveRiskAssessment")}
            </li>
            <li>
              <span className="text-green-600 mr-2">&#10003;</span>{" "}
              {t("costImpactAnalysis")}
            </li>
            <li>
              <span className="text-green-600 mr-2">&#10003;</span>{" "}
              {t("aiPoweredRecommendations")}
            </li>
          </ul>
          {!isEmbeddedMode && (
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 sm:px-5 sm:py-2 rounded-md transition-colors text-sm"
              onClick={() => router.push("/pricing")}
            >
              {t("subscribe")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsightsCard;

