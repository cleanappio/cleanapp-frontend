export type NotificationContentKind = "brand_digest" | "report_email" | "notification";

export type ReportNotificationSummary = {
  state: "sent" | "none_recorded" | "unavailable";
  email_count: number;
  recipient_count: number;
  latest_sent_at: string | null;
  preview_recipients: string[];
  hidden_recipient_count: number;
  history_complete: boolean;
  full_log_requires_subscription: boolean;
  content_kind: NotificationContentKind | "mixed";
  events: {
    sent_at: string | null;
    email_count: number;
    content_kind: NotificationContentKind;
  }[];
};

export type ReportNotificationHistory = ReportNotificationSummary & {
  recipients: {
    email: string;
    sent_at: string | null;
    status: "sent";
    content_kind: NotificationContentKind;
  }[];
};

export class NotificationHistoryError extends Error {
  constructor(public status: number) {
    super("Notification history unavailable");
  }
}

export async function fetchReportNotifications(
  publicId: string,
  options: { full?: boolean; token?: string | null; signal?: AbortSignal } = {},
): Promise<ReportNotificationSummary | ReportNotificationHistory> {
  if (options.full && !options.token) throw new NotificationHistoryError(401);
  const response = await fetch(
    `/api/reports/notifications?public_id=${encodeURIComponent(publicId)}${options.full ? "&full=1" : ""}`,
    {
      cache: "no-store",
      signal: options.signal,
      headers: options.full ? { Authorization: `Bearer ${options.token}` } : undefined,
    },
  );
  if (!response.ok) throw new NotificationHistoryError(response.status);
  const data = await response.json();
  if (!data || !["sent", "none_recorded"].includes(data.state) ||
    !Number.isInteger(data.email_count) || data.email_count < 0 ||
    (options.full && !Array.isArray(data.recipients))) {
    throw new NotificationHistoryError(503);
  }
  return data;
}

export function notificationContentLabel(kind: NotificationContentKind): string {
  if (kind === "brand_digest") return "Included in a digest";
  if (kind === "report_email") return "Report linked in email";
  return "Notification email";
}

/** Keep the public proxy response separate from subscriber-only recipient records. */
export function publicNotificationSummary(data: ReportNotificationSummary): ReportNotificationSummary {
  return {
    state: data.state,
    email_count: data.email_count,
    recipient_count: data.recipient_count,
    latest_sent_at: data.latest_sent_at,
    preview_recipients: data.preview_recipients?.slice(0, 1) || [],
    hidden_recipient_count: data.hidden_recipient_count,
    history_complete: data.history_complete,
    full_log_requires_subscription: true,
    content_kind: data.content_kind,
    events: (data.events || []).map(({ sent_at, email_count, content_kind }) => ({ sent_at, email_count, content_kind })),
  };
}

export function notificationDate(value: string | null, locale = "en"): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
