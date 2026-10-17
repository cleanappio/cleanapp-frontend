"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import Link from "next/link";
import PublicReportDetailPage, {
  EmbeddedReportBackBar,
} from "@/components/report/PublicReportDetailPage";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { usePublicBrandPreview } from "@/hooks/usePublicBrandPreview";
import { brandLabel } from "@/lib/report-evidence";
import PublicBrandDashboard from "@/components/brand/PublicBrandDashboard";
import type { PublicDiscoveryResolveResponse } from "@/types/public-discovery";

export type EmbeddedPublicReportSelection =
  | { kind: "report"; publicId: string; classification: "physical" | "digital" }
  | { kind: "brand"; brandName: string; brandDisplayName?: string; total?: number };

type Props = {
  report: EmbeddedPublicReportSelection | null;
  onClose: () => void;
  onOpenReport: (resolved: PublicDiscoveryResolveResponse) => void;
};

function EmbeddedPublicBrandPreview({
  brandName,
  brandDisplayName: mapDisplayName,
  total,
  onOpenReport,
}: {
  brandName: string;
  brandDisplayName?: string;
  total?: number;
  onOpenReport: Props["onOpenReport"];
}) {
  const { t } = useTranslations();
  const { items, brandDisplayName, isLoading, error, refresh } =
    usePublicBrandPreview(brandName, getCurrentLocale());
  const hasMapTotal = typeof total === "number" && Number.isSafeInteger(total) && total >= 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <h1 className="mb-3 text-2xl font-bold text-gray-900">
        {brandDisplayName || brandLabel(brandName, mapDisplayName)}
      </h1>
      {hasMapTotal && <p className="mb-4 text-gray-600">Reports on map: {total.toLocaleString("en")}</p>}
      <h2 className="mb-3 text-xl font-semibold text-gray-900">Recent reports</h2>
      {isLoading ? (
        <p role="status" className="text-gray-600">
          {t("loading")}
        </p>
      ) : error ? (
        <div>
          <p role="alert" className="text-red-600">{t("failedToFetchReport")}</p>
          <button type="button" onClick={refresh} className="mt-2 min-h-[44px] font-semibold text-green-800 hover:text-green-950">Try again</button>
        </div>
      ) : (
        <>
          <p className="mb-5 text-gray-600">
            {items.length ? `${items.length} ${items.length === 1 ? "report" : "reports"} in this preview.` : "No recent reports available."}
          </p>
          <PublicBrandDashboard items={items} pageBrand={brandName} activeKind="all" onOpenReport={onOpenReport} />
        </>
      )}
      <Link href={`/digital/${encodeURIComponent(brandName)}`} className="mt-5 inline-flex min-h-[44px] items-center font-semibold text-green-800 hover:text-green-950">
        Open brand page <span aria-hidden="true" className="ml-1">→</span>
      </Link>
    </div>
  );
}

export default function EmbeddedPublicReportDialog({
  report,
  onClose,
  onOpenReport,
}: Props) {
  const { t } = useTranslations();
  const returnFocusRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root
      open={Boolean(report)}
      onOpenChange={(open) => !open && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gray-50 outline-none"
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            returnFocusRef.current =
              document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus({ preventScroll: true });
          }}
        >
          <Dialog.Title className="sr-only">
            {report?.kind === "brand" ? t("reports") : t("reportDetails")}
          </Dialog.Title>
          <EmbeddedReportBackBar onBack={onClose} />
          <div
            key={report ? `${report.kind}-${report.kind === "report" ? report.publicId : report.brandName}` : "closed"}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
          >
            {report?.kind === "report" && (
              <PublicReportDetailPage
                key={report.publicId}
                publicId={report.publicId}
                expectedClassification={report.classification}
                presentation="embedded"
                onBack={onClose}
              />
            )}
            {report?.kind === "brand" && (
              <EmbeddedPublicBrandPreview
                key={report.brandName}
                brandName={report.brandName}
                brandDisplayName={report.brandDisplayName}
                total={report.total}
                onOpenReport={onOpenReport}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
