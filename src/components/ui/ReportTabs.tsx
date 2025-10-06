import React from "react";
import { useTranslations } from "@/lib/i18n";
import { ReportTab } from "@/hooks/useReportTabs";

interface ReportTabsProps {
  selectedTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
  className?: string;
}

/**
 * Reusable UI component for Physical vs Digital report tabs
 * Handles only the visual representation and user interaction
 */
export const ReportTabs: React.FC<ReportTabsProps> = ({
  selectedTab,
  onTabChange,
  className = "",
}) => {
  const { t } = useTranslations();

  return (
    <div
      className={`flex flex-row items-center justify-center gap-2 ${className}`}
    >
      <p
        className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
          selectedTab === "physical"
            ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
            : "hover:bg-gray-800"
        }`}
        onClick={() => onTabChange("physical")}
      >
        {t("physical")}
      </p>
      <p
        className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
          selectedTab === "digital"
            ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
            : "hover:bg-gray-800"
        }`}
        onClick={() => onTabChange("digital")}
      >
        {t("digital")}
      </p>
    </div>
  );
};
