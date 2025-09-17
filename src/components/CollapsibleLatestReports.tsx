"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTranslations } from "@/lib/i18n";
import LatestReports from "./LatestReports";
import { ReportWithAnalysis } from "./GlobeView";
import { useIsMobile } from "./GlobeView";
import { useEffect } from "react";

export function CollapsibleLatestReports({
  reports,
  loading,
  onReportClick,
  report,
  isModalActive = false,
  isMenuOpen = false,
}: {
  reports: ReportWithAnalysis[];
  loading: boolean;
  onReportClick: (report: ReportWithAnalysis) => void;
  report: ReportWithAnalysis | null;
  isModalActive?: boolean;
  isMenuOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(isMenuOpen);
  const { t } = useTranslations();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;
    setIsOpen(!isMenuOpen);
  }, [isMenuOpen, isMobile]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`absolute ${
        isMobile ? "left-2 bottom-12" : "left-10 bottom-10"
      } bg-gradient-to-b from-[#14213d] to-black text-white border border-slate-700 rounded-full text-center flex flex-col h-[60px] w-[60px] z-20`}
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-center h-[60px] w-[60px]">
          <ChevronsUpDown />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="">
        <LatestReports
          reports={reports}
          loading={loading}
          onReportClick={onReportClick}
          isModalActive={isModalActive}
          selectedReport={report}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
