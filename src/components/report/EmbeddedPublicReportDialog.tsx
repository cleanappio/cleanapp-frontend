"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import PublicReportDetailPage, {
  EmbeddedReportBackBar,
} from "@/components/report/PublicReportDetailPage";
import { getCurrentLocale, useTranslations } from "@/lib/i18n";
import { usePublicReportsByBrand } from "@/hooks/usePublicReportsByBrand";
import PublicBrandDashboard from "@/components/brand/PublicBrandDashboard";
import type { PublicDiscoveryResolveResponse } from "@/types/public-discovery";

export type EmbeddedPublicReportSelection =
  | { kind: "report"; publicId: string; classification: "physical" | "digital" }
  | { kind: "brand"; brandName: string };

type Props = {
  report: EmbeddedPublicReportSelection | null;
  onClose: () => void;
  onOpenReport: (resolved: PublicDiscoveryResolveResponse) => void;
};

function EmbeddedPublicBrandPreview({
  brandName,
  onOpenReport,
}: {
  brandName: string;
  onOpenReport: Props["onOpenReport"];
}) {
  const { t } = useTranslations();
  const { items, totalCount, brandDisplayName, isLoading, error } =
    usePublicReportsByBrand(brandName, getCurrentLocale());

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <h1 className="mb-3 text-2xl font-bold text-gray-900">
        {brandDisplayName || brandName}
      </h1>
      {isLoading ? (
        <p role="status" className="text-gray-600">
          {t("loading")}
        </p>
      ) : error ? (
        <p role="alert" className="text-red-600">
          {t("failedToFetchReport")}
        </p>
      ) : (
        <>
          <p className="mb-5 text-gray-600">
            {t("totalReports")} ({totalCount})
          </p>
          <PublicBrandDashboard items={items} onOpenReport={onOpenReport} />
        </>
      )}
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
                onOpenReport={onOpenReport}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
