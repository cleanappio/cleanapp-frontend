/** Original-source links are data, never trusted navigation instructions. */
export function safeOriginalSourceUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Invalid and missing dates remain unknown; ingestion is never substituted. */
export function evidenceDate(value?: string | null, locale = "en"): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/** Submission labels use the server-projected channel, never platform guesses. */
export function cleanAppSubmissionLabel(evidence?: { intake_method?: string | null; intake_channel?: string | null }): string | null {
  if (evidence?.intake_channel === "agent_api") return "via CleanApp Agentic API";
  if (evidence?.intake_method !== "cleanapp_submission") return null;
  switch (evidence.intake_channel) {
    case "mobile": return "via CleanApp mobile";
    case "web": return "via CleanApp web";
    case "share": return "via CleanApp share";
    default: return "via CleanApp";
  }
}

export type ReportContentKind = "firsthand" | "coverage" | "unknown";
export type ReportKindFilter = ReportContentKind | "all";
export type ReportSignalSort = "signal" | "recent" | "recurrence";

export function contentKind(value?: string | null): ReportContentKind {
  return value === "firsthand" || value === "coverage" ? value : "unknown";
}

export function matchesContentKind(value: string | null | undefined, filter: ReportKindFilter): boolean {
  return filter === "all" || contentKind(value) === filter;
}

export function brandLabel(name: string, displayName?: string): string {
  const known: Record<string, string> = {
    anthropic: "Anthropic", claude: "Claude", "claude-code": "Claude Code", claudecode: "Claude Code",
    openai: "OpenAI", chatgpt: "ChatGPT", "chat-gpt": "ChatGPT", codex: "Codex",
    grok: "Grok", xai: "xAI", "x-ai": "xAI", "openai-api": "OpenAI API",
    "openai-node": "OpenAI Node", "openai-python": "OpenAI Python", whisper: "Whisper", "dall-e": "DALL·E",
  };
  return known[name.toLowerCase()] || displayName || name;
}
