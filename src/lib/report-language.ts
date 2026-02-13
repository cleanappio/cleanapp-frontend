import { ReportAnalysis } from "@/components/GlobeView";

function normalize(value?: string): string {
  return (value || "").toLowerCase().trim();
}

export function isMontenegroDashboard(brandName?: string): boolean {
  const b = normalize(brandName);
  if (!b) return false;
  return (
    b.includes("montenegro") ||
    b.includes("crna-gora") ||
    b.includes("crnagora")
  );
}

export function getPreferredReportLanguage(
  brandName?: string,
  locale?: string
): string {
  if (isMontenegroDashboard(brandName)) {
    return (locale || "en").toLowerCase();
  }
  return "en";
}

export function pickPreferredAnalysis(
  analysis: ReportAnalysis[] | undefined,
  preferredLanguage: string,
  fallbackLanguage?: string
): ReportAnalysis | undefined {
  if (!analysis || analysis.length === 0) return undefined;

  const preferred = analysis.find(
    (a) => (a.language || "").toLowerCase() === preferredLanguage.toLowerCase()
  );
  if (preferred) return preferred;

  if (fallbackLanguage) {
    const fallback = analysis.find(
      (a) => (a.language || "").toLowerCase() === fallbackLanguage.toLowerCase()
    );
    if (fallback) return fallback;
  }

  return analysis[0];
}
