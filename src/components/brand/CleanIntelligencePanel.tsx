"use client";

import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  ts: number;
};

type IntelligenceResponse = {
  answer: string;
  reports_analyzed: number;
  paywall_triggered: boolean;
};

const PROMPT_SUGGESTIONS = [
  "What are the biggest issues reported this month?",
  "What problems are increasing fastest?",
  "Are there any security risks?",
  "What do users complain about most?",
  "What should we fix first?",
];

const UPGRADE_COPY = `You’ve reached the free intelligence limit.

Upgrade to access:
• Unlimited questions
• Full report details
• Raw data & exports
• Trend analysis and alerts`;

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

  const storageKey = useMemo(() => `cleanai_chat:${orgId}`, [orgId]);
  const placeholder = `Ask anything about issues affecting ${orgId}…`;

  useEffect(() => {
    if (typeof window === "undefined" || !orgId) return;
    const sid = getOrCreateSessionId(orgId);
    setSessionId(sid);

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
  }, [orgId, storageKey]);

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
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: IntelligenceResponse = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        text: data.answer || "No response available.",
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
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
        <h3 className="text-xl font-bold">CleanApp Intelligence</h3>
        <p className="text-sm text-green-100 mt-1">
          {reportsAnalyzed || totalReports} issues detected. Ask what matters to you.
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PROMPT_SUGGESTIONS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={limitReached || isLoading}
              onClick={() => sendPrompt(prompt)}
              className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 min-h-[220px] max-h-[360px] overflow-y-auto p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">{placeholder}</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={`${msg.ts}-${idx}`}
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white ml-8"
                      : "bg-white border border-gray-200 text-gray-900 mr-8"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {isLoading && (
                <div className="rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-gray-500 mr-8">
                  Analyzing…
                </div>
              )}
            </div>
          )}
        </div>

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

        <div className="flex gap-2">
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
        </div>

        <p className="text-xs text-gray-500">
          {messages.length === 0
            ? "Analyzing live CleanApp reports"
            : `Based on ${reportsAnalyzed || totalReports} reports • Updated recently`}
        </p>
      </div>
    </section>
  );
}

