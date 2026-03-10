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

  try {
    const navigated = await router.push({
      pathname: "/cases/[case_id]",
      query: { case_id: trimmedCaseId },
    });

    if (navigated) {
      return;
    }
  } catch (error) {
    console.error("Router navigation to case failed", error);
  }

  if (typeof window !== "undefined") {
    window.location.assign(`/cases/${encodedCaseId}`);
    return;
  }

  throw new Error(`Failed to navigate to case ${trimmedCaseId}`);
}
