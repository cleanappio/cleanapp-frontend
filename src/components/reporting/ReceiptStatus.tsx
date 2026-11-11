import { useEffect, useState } from "react";
import { fetchReportNotifications, notificationDate, type ReportNotificationSummary } from "@/lib/report-notifications";
import type { WebReportReceipt } from "@/lib/web-reporting";
import styles from "./ReportComposer.module.css";

/**
 * What has actually happened to this report, for the person who sent it.
 * Every line is a recorded fact from the receipt or the public notification
 * summary; nothing here is inferred from elapsed time.
 */
export default function ReceiptStatus({ receipt, processing, review, surface }: {
  receipt: WebReportReceipt; processing: boolean; review: boolean; surface: "widget" | "page";
}) {
  const published = receipt.publication_status === "public" || receipt.status === "published" || Boolean(receipt.canonical_path);
  const publicId = published ? receipt.public_id : undefined;
  const [sent, setSent] = useState<ReportNotificationSummary | null>(null);

  // A notification usually follows publication by a minute or two, so look a few times.
  useEffect(() => {
    setSent(null);
    if (!publicId || surface === "widget") return;
    const controller = new AbortController();
    let checks = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      checks++;
      try {
        const summary = await fetchReportNotifications(publicId!, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setSent(summary);
        if (summary.email_count > 0) return;
      } catch { /* The receipt stays valid without notification history. */ }
      if (!controller.signal.aborted && checks < 6) timer = setTimeout(check, 15_000);
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [publicId, surface]);

  // The widget stays minimal by design (docs/web-reporting.md); the receipt page carries the detail.
  if (surface === "widget") return null;

  const recipient = sent?.preview_recipients?.[0];
  const sentAt = notificationDate(sent?.latest_sent_at || null, "en");
  return <>
    <ol className={styles.statusList} aria-label="What has happened to your report">
      <li><span className={styles.statusMark} aria-hidden="true">✓</span><span>Received</span></li>
      <li className={published ? undefined : styles.statusPending}>
        <span className={styles.statusMark} aria-hidden="true">{published ? "✓" : "·"}</span>
        <span>{published ? "Analyzed and published" : review ? "Held for review before it is published" : processing ? "Being analyzed. This usually takes a few minutes." : "Analysis is taking longer than usual. This page will show the result."}</span>
      </li>
      {published && sent ? (
        <li className={sent.email_count > 0 ? undefined : styles.statusPending}>
          <span className={styles.statusMark} aria-hidden="true">{sent.email_count > 0 ? "✓" : "·"}</span>
          <span>
            {sent.email_count > 0
              ? <>Sent{recipient ? <> to <strong>{recipient}</strong></> : null}{sent.hidden_recipient_count > 0 ? ` and ${sent.hidden_recipient_count.toLocaleString("en")} more` : ""}{sentAt ? ` · ${sentAt}` : ""}</>
              : "No notification recorded yet."}
          </span>
        </li>
      ) : null}
    </ol>
    {!published && !review ? <p className={styles.statusNote}>You can leave this page. Keep your receipt link and come back to see where your report went.</p> : null}
    <p className={styles.statusRef}>Receipt {receipt.receipt_id}{receipt.public_id && published ? ` · Report ${receipt.public_id}` : ""}</p>
  </>;
}
