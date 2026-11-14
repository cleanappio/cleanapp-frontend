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

/** Additional public context must not turn a retained private URL into a link. */
export function safePublicReferenceUrl(value?: string | null): string | null {
  const safe = safeOriginalSourceUrl(value);
  if (!safe || safe.length > 2048) return null;
  const url = new URL(safe);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|lan)$/.test(host) || host === "0.0.0.0" || host.includes(":")) return null;
  const publicHost = host.replace(/^www\./, "");
  const path = url.pathname.toLowerCase();
  if (((publicHost === "x.com" || publicHost === "twitter.com") && (path.startsWith("/messages") || path.startsWith("/i/grok"))) ||
    (publicHost === "grok.com" && (path.startsWith("/chat/") || path.startsWith("/c/")))) return null;
  const octets = host.split(".").map(Number);
  if (octets.length === 4 && octets.every(Number.isInteger) && (octets[0] === 10 || octets[0] === 127 || octets[0] === 0 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31))) return null;
  const sensitive = /^(token|key|api_key|apikey|password|secret|access_token|authorization|signature|track|tracking_token|draft_token|receipt_token)$/i;
  for (const key of url.searchParams.keys()) if (sensitive.test(key)) return null;
  if (url.hash) return null;
  return safe;
}

/** Invalid and missing dates remain unknown; ingestion is never substituted. */
export function evidenceDate(value?: string | null, locale = "en"): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/** Submission labels use the server-projected channel, never platform guesses. */
export function cleanAppSubmissionLabel(evidence?: { intake_method?: string | null; intake_channel?: string | null; submission_transport?: string | null; submission_client?: string | null; submission_client_claimed?: boolean }): string | null {
  if (evidence?.intake_channel === "agent_api") {
    if (evidence.submission_transport === "web") return "Submitted through the CleanApp report form";
    const client = ({ grok: "Grok", chatgpt: "ChatGPT", claude: "Claude", codex: "Codex" }[evidence.submission_client || ""]);
    if (client && evidence.submission_client_claimed) return `Agent-assisted via ${evidence.submission_transport === "mcp" ? "CleanApp MCP · " : ""}${client} (declared)`;
    if (evidence.submission_transport === "mcp") return "Agent-assisted via CleanApp MCP";
    return "via CleanApp Agentic API";
  }
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
