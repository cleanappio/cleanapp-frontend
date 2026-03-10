"use client";

import PageHeader from "@/components/PageHeader";
import { getCanonicalReportPath } from "@/lib/report-links";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function LegacyDigitalReportRedirectPage() {
  const router = useRouter();
  const { report_seq } = router.query;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof report_seq !== "string") {
      return;
    }

    let cancelled = false;

    const redirect = async () => {
      try {
        const response = await fetch(`/api/reports/by-seq?seq=${encodeURIComponent(report_seq)}`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const publicId = data?.report?.public_id;
        const classification =
          data?.analysis?.[0]?.classification || "digital";
        const target = getCanonicalReportPath(classification, publicId);

        if (!cancelled && target) {
          router.replace(target);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load report");
        }
      }
    };

    redirect();

    return () => {
      cancelled = true;
    };
  }, [report_seq, router]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <PageHeader />
      <div className="max-w-3xl mx-auto my-8 px-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {error || "Redirecting to the current report URL..."}
          </p>
        </div>
      </div>
    </div>
  );
}
