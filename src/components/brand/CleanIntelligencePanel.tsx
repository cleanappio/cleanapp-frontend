"use client";

import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QualityMode = "fast" | "deep";
type IntelligenceMode = "full" | "partial_free" | "blocked";

type IntelligenceEvidenceItem = {
  seq: number;
  title: string;
  permalink: string;
};

type IntelligenceExample = {
  id: number;
  created_at: string;
  channel: string;
  severity: number;
  category: string;
  title: string;
  snippet: string;
  url?: string;
};

type IntelligenceCitation = {
  label: string;
  value: string;
};

type IntelligenceAggregates = {
  total_reports: number;
  reports_this_month: number;
  reports_last_30_days: number;
  reports_last_7_days: number;
  reports_prev_7_days: number;
  growth_last_7_vs_prev_7: number;
};

type IntelligenceResponseData = {
  aggregates?: IntelligenceAggregates;
  examples?: IntelligenceExample[];
  citations?: IntelligenceCitation[];
};

type IntelligenceUpsell = {
  text: string;
  cta: string;
};

type IntelligenceResponse = {
  mode?: IntelligenceMode;
  answer_markdown?: string;
  data?: IntelligenceResponseData;
  upsell?: IntelligenceUpsell | null;
  suggested_prompts?: string[];

  // Backward compatibility
  answer?: string;
  reports_analyzed?: number;
  paywall_triggered?: boolean;
  evidence?: IntelligenceEvidenceItem[];
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  ts: number;
  mode?: IntelligenceMode;
  evidence?: IntelligenceEvidenceItem[];
  examples?: IntelligenceExample[];
  upsell?: IntelligenceUpsell | null;
};

const UPGRADE_COPY = `You’ve reached the free intelligence limit.

Upgrade to access:
• Unlimited questions
• Full report details
• Raw data & exports
• Trend analysis and alerts`;

const PROMPT_SUGGESTIONS = [
  "What are the biggest issues reported this month?",
  "What problems are increasing fastest?",
  "What do users complain about most?",
];

const INLINE_TOKEN_REGEX = /(https?:\/\/[^\s]+|Report\s+#\d+|Upgrade to Pro)/g;
const REPORT_REF_REGEX = /^Report\s+#(\d+)$/i;

function trackCleanAIEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }
  const details = { event, ...payload };
  const w = window as typeof window & {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  };
  if (w.dataLayer && Array.isArray(w.dataLayer)) {
    w.dataLayer.push(details);
  }
  if (typeof w.gtag === "function") {
    w.gtag("event", event, payload);
  }
}

function getOrCreateSessionId(orgId: string): string {
  const key = `cleanai_session_id:${orgId}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(key, created);
  return created;
}

function toEvidenceItemsFromExamples(examples: IntelligenceExample[] = []): IntelligenceEvidenceItem[] {
  return examples
    .filter((ex) => ex.id > 0)
    .map((ex) => ({
      seq: ex.id,
      title: ex.title || `Report #${ex.id}`,
      permalink: ex.url || "",
    }));
}

function renderMessageWithLinks(
  text: string,
  evidence: IntelligenceEvidenceItem[] = [],
  orgId: string
) {
  const lines = text.split("\n");
  const evidenceBySeq = new Map<number, string>();
  for (const item of evidence) {
    if (item.seq > 0 && item.permalink) {
      evidenceBySeq.set(item.seq, item.permalink);
    }
  }

  return lines.map((line, lineIdx) => {
    const parts = line.split(INLINE_TOKEN_REGEX);
    return (
      <span key={`line-${lineIdx}`}>
        {parts.map((part, partIdx) => {
          if (!part) return null;
          if (part === "Upgrade to Pro") {
            return (
              <Link
                key={`pro-${lineIdx}-${partIdx}`}
                href="/pricing"
                className="underline text-green-700 hover:text-green-600 font-semibold"
              >
                Upgrade to Pro
              </Link>
            );
          }

          const reportRef = part.match(REPORT_REF_REGEX);
          if (reportRef) {
            const seq = Number(reportRef[1]);
            const href = evidenceBySeq.get(seq) ?? `/digital/${orgId}/report/${seq}`;
            return (
              <a
                key={`rep-${lineIdx}-${partIdx}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800 hover:bg-green-100 align-middle"
              >
                Report #{seq}
              </a>
            );
          }

          if (!/^https?:\/\//i.test(part)) {
            return <span key={`txt-${lineIdx}-${partIdx}`}>{part}</span>;
          }

          const cleaned = part.replace(/[),.;!?]+$/, "");
          const suffix = part.slice(cleaned.length);
          return (
            <span key={`lnk-${lineIdx}-${partIdx}`}>
              <a
                href={cleaned}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-green-700 hover:text-green-600 break-all"
              >
                {cleaned}
              </a>
              {suffix}
            </span>
          );
        })}
        {lineIdx < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

export default function CleanIntelligencePanel({
  orgId,
  totalReports,
}: {
  orgId: string;
  totalReports: number;
}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const subscription = useAuthStore((state) => state.subscription);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [reportsAnalyzed, setReportsAnalyzed] = useState(totalReports);
  const [sessionId, setSessionId] = useState("");
  const [qualityMode, setQualityMode] = useState<QualityMode>("deep");
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>(PROMPT_SUGGESTIONS);

  const storageKey = useMemo(() => `cleanai_chat:${orgId}`, [orgId]);
  const qualityStorageKey = useMemo(() => `cleanai_quality_mode:${orgId}`, [orgId]);
  const placeholder = `Ask anything about issues affecting ${orgId}…`;

  useEffect(() => {
    if (typeof window === "undefined" || !orgId) return;
    const sid = getOrCreateSessionId(orgId);
    setSessionId(sid);

    const modeRaw = sessionStorage.getItem(qualityStorageKey);
    if (modeRaw === "fast" || modeRaw === "deep") {
      setQualityMode(modeRaw);
    }

    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
      if (typeof parsed.limitReached === "boolean") setLimitReached(parsed.limitReached);
      if (typeof parsed.reportsAnalyzed === "number") setReportsAnalyzed(parsed.reportsAnalyzed);
    } catch (e) {
      console.error("Failed to restore CleanAI session state:", e);
    }
  }, [orgId, storageKey, qualityStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !orgId) return;
    const payload = {
      messages,
      limitReached,
      reportsAnalyzed,
    };
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }, [orgId, storageKey, messages, limitReached, reportsAnalyzed]);

  useEffect(() => {
    if (typeof window === "undefined" || !orgId) return;
    sessionStorage.setItem(qualityStorageKey, qualityMode);
  }, [orgId, qualityStorageKey, qualityMode]);

  useEffect(() => {
    if (!orgId) return;
    trackCleanAIEvent("cleanai_opened", { org_id: orgId });
  }, [orgId]);

  const subscriptionTier = useMemo(() => {
    if (subscription?.status === "active") return "pro";
    if (isAuthenticated) return "free";
    return "anonymous";
  }, [subscription?.status, isAuthenticated]);

  async function sendPrompt(prompt: string) {
    const question = prompt.trim();
    if (!question || isLoading || limitReached || !sessionId) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: question,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    trackCleanAIEvent("cleanai_prompt_sent", {
      org_id: orgId,
      subscription_tier: subscriptionTier,
      length: question.length,
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/intelligence/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            org_id: orgId,
            question,
            session_id: sessionId,
            user_id: user?.id ?? null,
            subscription_tier: subscriptionTier,
            quality_mode: qualityMode,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: IntelligenceResponse = await response.json();
      const examples = Array.isArray(data.data?.examples) ? data.data?.examples : [];
      const legacyEvidence = Array.isArray(data.evidence) ? data.evidence : [];
      const mergedEvidence = examples.length > 0 ? toEvidenceItemsFromExamples(examples) : legacyEvidence;

      const assistantMessage: ChatMessage = {
        role: "assistant",
        text: data.answer_markdown || data.answer || "No response available.",
        ts: Date.now(),
        mode: data.mode,
        evidence: mergedEvidence,
        examples,
        upsell: data.upsell || null,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (Array.isArray(data.suggested_prompts) && data.suggested_prompts.length > 0) {
        setPromptSuggestions(data.suggested_prompts.slice(0, 3));
      } else {
        setPromptSuggestions(PROMPT_SUGGESTIONS);
      }

      if (typeof data.reports_analyzed === "number" && data.reports_analyzed > 0) {
        setReportsAnalyzed(data.reports_analyzed);
      }

      if (data.paywall_triggered) {
        setLimitReached(true);
        trackCleanAIEvent("cleanai_limit_hit", {
          org_id: orgId,
          subscription_tier: subscriptionTier,
        });
      }
    } catch (error) {
      console.error("CleanAI query failed:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I couldn’t analyze that right now. Please try again in a moment.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-green-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-700 to-green-500 px-5 py-4 text-white">
        <h3 className="text-xl font-bold">Live CleanApp Intelligence</h3>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {!limitReached && (
          <div className="flex flex-wrap gap-2">
            {promptSuggestions.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendPrompt(prompt)}
                disabled={isLoading}
                className="rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {(messages.length > 0 || isLoading) && (
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {messages.map((msg, idx) => (
              <div key={`${msg.ts}-${idx}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white ml-8"
                      : "bg-white border border-gray-200 text-gray-900 mr-8"
                  }`}
                >
                  {msg.role === "assistant"
                    ? renderMessageWithLinks(msg.text, msg.evidence || [], orgId)
                    : msg.text}
                </div>

                {msg.role === "assistant" && Array.isArray(msg.examples) && msg.examples.length > 0 && (
                  <div className="mr-8 mt-2 grid gap-2 sm:grid-cols-2">
                    {msg.examples.slice(0, 5).map((ex) => (
                      <a
                        key={`${msg.ts}-${ex.id}`}
                        href={ex.url || `/digital/${orgId}/report/${ex.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-green-200 bg-green-50 p-2 hover:bg-green-100"
                      >
                        <div className="text-xs font-semibold text-green-800">
                          Report #{ex.id} • {ex.channel} • sev {Number(ex.severity || 0).toFixed(2)}
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-900">{ex.title}</div>
                        <div className="mt-1 text-xs text-gray-600 line-clamp-3">{ex.snippet}</div>
                      </a>
                    ))}
                  </div>
                )}

                {msg.role === "assistant" && msg.upsell && (
                  <div className="mr-8 mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-gray-800">
                    <span>{msg.upsell.text} </span>
                    <Link href="/pricing" className="font-semibold text-green-700 underline hover:text-green-600">
                      {msg.upsell.cta || "Upgrade to Pro"}
                    </Link>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-gray-500 mr-8">
                Analyzing…
              </div>
            )}
          </div>
        )}

        {limitReached && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{UPGRADE_COPY}</p>
            <Link
              href="/pricing"
              onClick={() => {
                trackCleanAIEvent("cleanai_upgrade_clicked", {
                  org_id: orgId,
                  subscription_tier: subscriptionTier,
                });
              }}
              className="inline-flex mt-3 rounded-lg bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700"
            >
              Unlock Full Intelligence
            </Link>
          </div>
        )}

        <div className="relative">
          {!limitReached && !isLoading && (
            <div className="cleanai-halo pointer-events-none absolute -inset-1 rounded-xl border border-green-300/70" />
          )}
          <div className="relative flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendPrompt(input);
                }
              }}
              disabled={limitReached || isLoading}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={limitReached || isLoading || !input.trim()}
              onClick={() => sendPrompt(input)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
            <div className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setQualityMode("fast")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  qualityMode === "fast"
                    ? "bg-green-600 text-white"
                    : "text-green-700 hover:bg-green-50"
                }`}
              >
                Fast
              </button>
              <button
                type="button"
                onClick={() => setQualityMode("deep")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  qualityMode === "deep"
                    ? "bg-green-600 text-white"
                    : "text-green-700 hover:bg-green-50"
                }`}
              >
                Deep
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
