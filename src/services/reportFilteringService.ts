import { ReportWithAnalysis } from "@/components/GlobeView";
import { ReportTab } from "@/hooks/useReportTabs";

/**
 * Service for filtering and processing reports by classification
 * Contains pure business logic with no UI dependencies
 */
export class ReportFilteringService {
  /**
   * Filter reports by classification (physical or digital)
   */
  static filterByClassification(
    reports: ReportWithAnalysis[],
    classification: "physical" | "digital"
  ): ReportWithAnalysis[] {
    return reports.filter((report) =>
      report.analysis.some(
        (analysis) => analysis.classification === classification
      )
    );
  }

  /**
   * Get physical reports only
   */
  static getPhysicalReports(
    reports: ReportWithAnalysis[]
  ): ReportWithAnalysis[] {
    return this.filterByClassification(reports, "physical");
  }

  /**
   * Get digital reports only
   */
  static getDigitalReports(
    reports: ReportWithAnalysis[]
  ): ReportWithAnalysis[] {
    return this.filterByClassification(reports, "digital");
  }

  /**
   * Get reports for a specific tab
   */
  static getReportsForTab(
    reports: ReportWithAnalysis[],
    tab: ReportTab
  ): ReportWithAnalysis[] {
    return tab === "physical"
      ? this.getPhysicalReports(reports)
      : this.getDigitalReports(reports);
  }

  /**
   * Check if a report is physical
   */
  static isPhysicalReport(report: ReportWithAnalysis): boolean {
    return report.analysis.some(
      (analysis) => analysis.classification === "physical"
    );
  }

  /**
   * Check if a report is digital
   */
  static isDigitalReport(report: ReportWithAnalysis): boolean {
    return report.analysis.some(
      (analysis) => analysis.classification === "digital"
    );
  }

  /**
   * Get report statistics by classification
   */
  static getReportStats(reports: ReportWithAnalysis[]) {
    const physicalReports = this.getPhysicalReports(reports);
    const digitalReports = this.getDigitalReports(reports);

    return {
      total: reports.length,
      physical: physicalReports.length,
      digital: digitalReports.length,
    };
  }
}
