import type { NextRouter } from "next/router";

export async function navigateToCase(
  router: NextRouter,
  caseId: string
): Promise<void> {
  const trimmedCaseId = caseId?.trim();
  if (!trimmedCaseId) {
    throw new Error("Missing case id");
  }

  const encodedCaseId = encodeURIComponent(trimmedCaseId);
  const destination = `/cases/${encodedCaseId}`;
  const absoluteDestination =
    typeof window !== "undefined" &&
    window.location.hostname.toLowerCase() === "cleanapp.io"
      ? `https://www.cleanapp.io${destination}`
      : destination;

  try {
    const navigated = await router.push(absoluteDestination);

    if (navigated) {
      return;
    }
  } catch (error) {
    console.error("Router navigation to case failed", error);
  }

  if (typeof window !== "undefined") {
    window.location.assign(absoluteDestination);
    return;
  }

  throw new Error(`Failed to navigate to case ${trimmedCaseId}`);
}
