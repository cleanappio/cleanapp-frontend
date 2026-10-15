import { Mail } from "lucide-react";
import type { PublicNotificationCount } from "@/types/public-discovery";

export default function ReportNotificationCount({ count, reportTitle, onOpen, opening = false, locale = "en" }: {
  count?: PublicNotificationCount;
  reportTitle: string;
  onOpen: () => void;
  opening?: boolean;
  locale?: string;
}) {
  const positive = count?.state === "sent" && Number.isSafeInteger(count.email_count) && count.email_count > 0;
  const zero = count?.state === "none_recorded" && count.email_count === 0;
  const label = positive
    ? `${count.email_count.toLocaleString(locale)} notification ${count.email_count === 1 ? "email" : "emails"} sent`
    : zero ? "0 notification emails" : "Notification count unavailable";

  return (
    <button type="button" onClick={onOpen} disabled={opening} aria-busy={opening}
      aria-label={`${label}. View notification history for ${reportTitle || "this report"}`}
      className={`inline-flex min-h-[44px] items-center gap-1.5 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-60 ${positive ? "font-semibold text-green-800 hover:text-green-950" : "text-gray-500 hover:text-gray-700"}`}>
      <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
