export type ReportClassification = "physical" | "digital";

export function getCanonicalReportPath(
  classification: ReportClassification,
  publicId?: string | null
): string | null {
  if (!publicId) {
    return null;
  }
  return `/${classification}/report/${encodeURIComponent(publicId)}`;
}

export function getHomeReportQuery(
  classification: ReportClassification,
  publicId?: string | null
): string | null {
  if (!publicId) {
    return null;
  }
  return `/?tab=${classification}&public_id=${encodeURIComponent(publicId)}`;
}
