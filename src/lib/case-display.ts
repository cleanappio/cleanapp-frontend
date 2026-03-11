type CaseTargetLike = {
  display_name?: string | null;
  organization?: string | null;
  confidence_score?: number | null;
};

const GENERIC_AREA_TITLE = "selected area incident cluster";

function normalizeText(value?: string | null): string {
  return (value || "").trim();
}

function isContactishLabel(value: string): boolean {
  return /@|https?:\/\//i.test(value);
}

function isLowSignalPlaceLabel(value: string): boolean {
  return /municipality|public works|maintenance|support|info/i.test(value);
}

function scoreLandmarkCandidate(
  value: string,
  confidence: number,
  index: number,
): number {
  let score = confidence;
  if (isContactishLabel(value)) {
    score -= 2;
  }
  if (isLowSignalPlaceLabel(value)) {
    score -= 0.3;
  }
  if (value.includes(" - ")) {
    score -= 0.04;
  }
  score -= Math.min(value.length, 80) * 0.001;
  score -= index * 0.01;
  return score;
}

export function isGenericAreaCaseTitle(value?: string | null): boolean {
  return normalizeText(value).toLowerCase() === GENERIC_AREA_TITLE;
}

export function isGenericAreaCaseSummary(value?: string | null): boolean {
  return normalizeText(value).toLowerCase().includes("selected area");
}

export function deriveCaseLandmarkLabel(
  targets: CaseTargetLike[] | null | undefined,
): string | null {
  const ranked = (targets || [])
    .flatMap((target, index) => {
      const confidence = Math.max(0, target.confidence_score || 0);
      return [target.display_name, target.organization]
        .map((raw) => normalizeText(raw))
        .filter(Boolean)
        .map((value) => ({
          value,
          score: scoreLandmarkCandidate(value, confidence, index),
        }));
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.value || null;
}

export function buildCaseDisplayTitle(
  title?: string | null,
  landmarkLabel?: string | null,
): string {
  const trimmedTitle = normalizeText(title);
  const trimmedLandmark = normalizeText(landmarkLabel);

  if (isGenericAreaCaseTitle(trimmedTitle) && trimmedLandmark) {
    return `Incident cluster at ${trimmedLandmark}`;
  }
  return trimmedTitle || "Incident cluster";
}

export function buildCaseDisplaySummary(
  summary?: string | null,
  landmarkLabel?: string | null,
): string {
  const trimmedSummary = normalizeText(summary);
  const trimmedLandmark = normalizeText(landmarkLabel);

  if (isGenericAreaCaseSummary(trimmedSummary) && trimmedLandmark) {
    return `Case created from area scope around ${trimmedLandmark}.`;
  }
  return trimmedSummary || "No summary provided yet.";
}

export function buildCaseScopeLabel(
  scopeLabel: string,
  targets: CaseTargetLike[] | null | undefined,
): string {
  const trimmedScopeLabel = normalizeText(scopeLabel);
  if (
    trimmedScopeLabel &&
    trimmedScopeLabel.toLowerCase() !== "selected area"
  ) {
    return trimmedScopeLabel;
  }
  return deriveCaseLandmarkLabel(targets) || trimmedScopeLabel || "this area";
}
