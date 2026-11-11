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
  /** What came back after sending, oldest first. Absent on older backends. */
  timeline?: ReportOutcomeEvent[];
};

export type ReportOutcomeType =
  | "viewed" | "acknowledged" | "replied" | "bounced" | "no_response" | "fixed" | "out_of_office";

/** One recorded outcome. `count` is how often it was recorded; `at` is the first time. */
export type ReportOutcomeEvent = {
  type: ReportOutcomeType;
  at: string;
  count: number;
  ticket_ref?: string;
};

const OUTCOME_LABELS: Record<ReportOutcomeType, string> = {
  viewed: "Opened by the recipient",
  acknowledged: "Acknowledged",
  replied: "Reply received",
  bounced: "Could not be delivered",
  no_response: "No response yet",
  fixed: "Marked as fixed",
  out_of_office: "Automatic out-of-office reply",
};

/** Plain-language label for an outcome, or null for a type this client does not know. */
export function outcomeLabel(event: ReportOutcomeEvent): string | null {
  const label = OUTCOME_LABELS[event.type];
  if (!label) return null;
  if (event.type === "acknowledged" && event.ticket_ref) return `${label} (ticket ${event.ticket_ref})`;
  if (event.type === "viewed" && event.count > 1) return `${label} (${event.count.toLocaleString("en")} times)`;
  return label;
}

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
    // Outcomes are free for everyone; only known fields are passed through.
    timeline: (data.timeline || []).map(({ type, at, count, ticket_ref }) => ({ type, at, count, ...(ticket_ref ? { ticket_ref } : {}) })),
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
