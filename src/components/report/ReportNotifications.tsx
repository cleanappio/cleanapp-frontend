"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { authApiClient } from "@/lib/auth-api-client";
import {
  fetchReportNotifications,
  NotificationHistoryError,
  notificationContentLabel,
  notificationDate,
  type ReportNotificationHistory,
  type ReportNotificationSummary,
} from "@/lib/report-notifications";

type HistoryState = "closed" | "loading" | "open" | "signin" | "subscribe" | "error";

type ViewProps = {
  summary: ReportNotificationSummary | null;
  loading?: boolean;
  error?: boolean;
  history?: ReportNotificationHistory | null;
  historyState?: HistoryState;
  authenticated?: boolean;
  returnPath: string;
  locale?: string;
  onHistory?: () => void;
};

export function ReportNotificationsView({
  summary, loading, error, history, historyState = "closed", authenticated = false,
  returnPath, locale = "en", onHistory,
}: ViewProps) {
  const sectionId = useId();
  const latestSent = notificationDate(summary?.latest_sent_at || null, locale);
  const preview = summary?.preview_recipients?.slice(0, 1) || [];
  const unavailable = error || !summary || summary.state === "unavailable";

  return (
    <section aria-labelledby={`${sectionId}-heading`} className="mb-6 border-b border-gray-200 pb-6">
      <h2 id={`${sectionId}-heading`} className="text-lg font-semibold text-gray-900">Notifications</h2>
      {loading ? <p className="mt-2 text-sm text-gray-500" role="status">Loading notification history…</p> : null}
      {!loading && unavailable ? (
        <p className="mt-2 text-sm text-gray-500" role="status">Notification history unavailable.</p>
      ) : null}
      {!loading && !unavailable && summary ? (
        <>
          <p className={`mt-2 font-medium ${summary.email_count > 0 ? "text-green-800" : "text-gray-700"}`}>
            {summary.email_count > 0
              ? `${summary.email_count.toLocaleString(locale)} notification ${summary.email_count === 1 ? "email" : "emails"} sent`
              : "No notification emails recorded yet."}
          </p>
          {summary.email_count > 0 ? (
            <>
              <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-600">
                {latestSent ? <span>Latest: <time dateTime={summary.latest_sent_at!}>{latestSent}</time></span> : null}
              </p>
              {preview.length > 0 ? (
                <p className="mt-2 break-words text-sm text-gray-700">
                  To: <span className="font-medium">{preview[0]}</span>
                  {summary.hidden_recipient_count > 0 ? ` + ${summary.hidden_recipient_count.toLocaleString(locale)} more` : ""}
                </p>
              ) : null}
              <div className="mt-3 text-sm">
                {!authenticated || historyState === "signin" ? (
                  <Link href={`/login?redirect=${encodeURIComponent(returnPath)}`} className="font-medium text-green-800 underline decoration-green-200 underline-offset-4 hover:decoration-green-700">
                    Sign in to view full history
                  </Link>
                ) : historyState === "subscribe" ? (
                  <Link href="/pricing" className="font-medium text-green-800 underline decoration-green-200 underline-offset-4 hover:decoration-green-700">
                    Subscribe to view full history
                  </Link>
                ) : (
                  <button type="button" onClick={onHistory} disabled={historyState === "loading"}
                    aria-expanded={historyState === "open"}
                    aria-controls={`${sectionId}-history`}
                    className="min-h-[44px] text-left font-medium text-green-800 underline decoration-green-200 underline-offset-4 hover:decoration-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 disabled:text-gray-500">
                    {historyState === "loading" ? "Loading history…" : historyState === "open" ? "Hide history" : historyState === "error" ? "Try loading history again" : "View full history"}
                  </button>
                )}
                {historyState !== "open" ? <span className="ml-2 text-xs text-gray-500">For subscribers</span> : null}
              </div>
              {historyState === "error" ? <p className="mt-1 text-sm text-gray-500" role="status">Notification history unavailable.</p> : null}
              {authenticated && historyState === "open" && history ? (
                <div id={`${sectionId}-history`} className="mt-3">
                  <ol className="divide-y divide-gray-200">
                    {history.recipients.map((recipient, index) => (
                      <li key={`${recipient.email}-${recipient.sent_at}-${index}`} className="py-3 text-sm">
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                          <span className="break-all font-medium text-gray-900">{recipient.email}</span>
                          <time dateTime={recipient.sent_at || undefined} className="text-gray-500">{notificationDate(recipient.sent_at, locale) || "Date unavailable"}</time>
                        </div>
                        <p className="mt-1 text-gray-600">Sent · {notificationContentLabel(recipient.content_kind)}</p>
                      </li>
                    ))}
                  </ol>
                  {!history.history_complete ? <p className="mt-2 text-xs text-gray-500">Available recorded history.</p> : null}
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default function ReportNotifications({ publicId, returnPath, locale }: {
  publicId: string; returnPath: string; locale?: string;
}) {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const [summary, setSummary] = useState<ReportNotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState<ReportNotificationHistory | null>(null);
  const [historyState, setHistoryState] = useState<HistoryState>("closed");
  const [historyOwner, setHistoryOwner] = useState("");
  const currentOwner = `${publicId}:${userId || ""}`;
  const historyRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setLoading(true);
    setError(false);
    fetchReportNotifications(publicId, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setSummary(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [publicId]);

  useEffect(() => {
    historyRequest.current?.abort();
    setHistory(null);
    setHistoryOwner("");
    setHistoryState("closed");
    return () => historyRequest.current?.abort();
  }, [publicId, authenticated, userId]);

  const loadHistory = async () => {
    if (historyState === "open") {
      setHistoryState("closed");
      setHistory(null);
      return;
    }
    historyRequest.current?.abort();
    const controller = new AbortController();
    historyRequest.current = controller;
    setHistory(null);
    setHistoryState("loading");
    try {
      const data = await fetchReportNotifications(publicId, {
        full: true, token: authApiClient.getAuthToken(), signal: controller.signal,
      }) as ReportNotificationHistory;
      if (!controller.signal.aborted) {
        setHistory(data);
        setHistoryOwner(currentOwner);
        setHistoryState("open");
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setHistory(null);
        setHistoryState(err instanceof NotificationHistoryError && err.status === 401
          ? "signin" : err instanceof NotificationHistoryError && err.status === 403 ? "subscribe" : "error");
      }
    }
  };

  return <ReportNotificationsView summary={summary} loading={loading} error={error}
    history={historyOwner === currentOwner ? history : null}
    historyState={historyState === "open" && historyOwner !== currentOwner ? "closed" : historyState} authenticated={authenticated}
    returnPath={returnPath} locale={locale} onHistory={loadHistory} />;
}
