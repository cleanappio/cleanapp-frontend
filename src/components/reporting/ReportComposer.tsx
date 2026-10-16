import { useEffect, useId, useRef, useState } from "react";
import { ArrowUp, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { newWebReportPayload, prepareReportImage, readReportReceipt, reportApiBase, submissionError, trackReportEvent, validateReportDraft, type WebReportPayload, type WebReportReceipt } from "@/lib/web-reporting";
import styles from "./ReportComposer.module.css";
import ReportProgress from "./ReportProgress";

function receiptIsProcessing(receipt: WebReportReceipt) {
  if (receipt.publication_status) return receipt.publication_status === "pending_analysis";
  if (receipt.processing_status) return receipt.processing_status === "pending_analysis";
  return ["received", "accepted", "duplicate"].includes(receipt.status);
}

function receiptIsComplete(receipt: WebReportReceipt) {
  if (receipt.publication_status) return ["public", "review_required"].includes(receipt.publication_status);
  return receipt.processing_status === "analyzed" || receipt.status === "published" || Boolean(receipt.canonical_path);
}

export function ReportReceipt({ receipt: initialReceipt, onAnother, surface = "page" }: { receipt: WebReportReceipt; onAnother?: () => void; surface?: "widget" | "page" }) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const [polling, setPolling] = useState(() => !receiptIsComplete(initialReceipt));
  useEffect(() => {
    setReceipt(initialReceipt);
    setPolling(!receiptIsComplete(initialReceipt));
    if (receiptIsComplete(initialReceipt)) return;
    let active = true;
    let checks = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      checks++;
      let done = false;
      try {
        const response = await fetch(`${reportApiBase()}/receipts/${encodeURIComponent(initialReceipt.receipt_id)}`, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(10_000) });
        const next = response.ok ? readReportReceipt(await response.json()) : null;
        if (active && next) { setReceipt(next); done = receiptIsComplete(next); }
      } catch { /* The accepted receipt remains valid during a temporary outage. */ }
      if (active && !done && checks < 8) timer = setTimeout(refresh, Math.min(5000 * (checks + 1), 15000));
      else if (active) setPolling(false);
    }
    timer = setTimeout(refresh, 5000);
    return () => { active = false; clearTimeout(timer); };
  }, [initialReceipt]);
  const review = receipt.publication_status
    ? receipt.publication_status === "review_required"
    : ["shadowed", "quarantined"].includes(receipt.status);
  const processing = polling && receiptIsProcessing(receipt);
  const title = receipt.publication_status === "public" ? "Your report is ready to view." : review ? "Your report is under review." : "We’re on it.";
  return <div className={styles.receipt}>
    <ReportProgress processing={processing} receiptId={receipt.receipt_id} title={title} />
    <div className={styles.receiptActions}>
      {surface !== "widget" && receipt.canonical_path && <Link className={styles.link} href={receipt.canonical_path}>View report</Link>}
      <Link className={styles.link} href={`/report-a-problem?receipt=${encodeURIComponent(receipt.receipt_id)}`}>Keep your receipt</Link>
      {onAnother && <button type="button" className={styles.link} onClick={onAnother}>Report something else</button>}
    </div>
  </div>;
}

export function useReportComposerState() {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<{ file: File; image: string; preview: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<WebReportReceipt | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const draft = useRef<WebReportPayload | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const imageVersion = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (attachment) URL.revokeObjectURL(attachment.preview); }, [attachment]);
  return { text, setText, attachment, setAttachment, preparing, setPreparing, sending, setSending, error, setError, receipt, setReceipt, fileInput, draft, locked, mounted, imageVersion };
}

export default function ReportComposer({ surface = "page", state }: { surface?: "widget" | "page"; state?: ReturnType<typeof useReportComposerState> }) {
  const id = useId();
  const localState = useReportComposerState();
  const { text, setText, attachment, setAttachment, preparing, setPreparing, sending, setSending, error, setError, receipt, setReceipt, fileInput, draft, locked, mounted, imageVersion } = state || localState;

  async function addImage(file?: File) {
    if (!file || locked.current) return;
    const version = ++imageVersion.current;
    setPreparing(true); setError("");
    try {
      const image = await prepareReportImage(file);
      if (mounted.current && version === imageVersion.current) {
        setAttachment({ file, image, preview: URL.createObjectURL(file) });
        draft.current = null;
      }
    } catch (err) {
      if (mounted.current && version === imageVersion.current) setError(err instanceof Error ? err.message : "We couldn’t open that image.");
    } finally {
      if (mounted.current && version === imageVersion.current) setPreparing(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (locked.current || preparing) return;
    const issue = validateReportDraft(text, !!attachment);
    if (issue) { setError(issue); return; }
    locked.current = true; setSending(true); setError("");
    try {
      // Retry the identical payload after network errors to avoid duplicate reports.
      draft.current ||= newWebReportPayload(text, attachment?.image);
      trackReportEvent("report_submit_started", surface);
      const response = await fetch(`${reportApiBase()}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(draft.current), credentials: "omit", signal: AbortSignal.timeout(30_000),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(submissionError(response.status));
      const accepted = readReportReceipt(data);
      if (!accepted) throw new Error("We couldn’t confirm receipt. Please try again; your draft is still here.");
      if (mounted.current) {
        setReceipt(accepted); setText(""); setAttachment(null); draft.current = null;
        trackReportEvent("report_submit_accepted", surface, accepted.status);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error && !["TimeoutError", "AbortError", "TypeError"].includes(err.name) ? err.message : "We couldn’t confirm receipt. Please try again; your draft is still here.");
        trackReportEvent("report_submit_error", surface);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setSending(false);
    }
  }

  if (receipt) return <ReportReceipt receipt={receipt} surface={surface} onAnother={() => setReceipt(null)} />;
  return <form className={styles.composer} onSubmit={submit} aria-label="Report a problem" aria-busy={sending || preparing}>
    <div className={styles.box} onDragOver={e => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (!sending) void addImage(e.dataTransfer.files[0]); }}>
      <label htmlFor={`${id}-message`} className="sr-only">What’s wrong?</label>
      <textarea id={`${id}-message`} className={styles.textarea} placeholder="What’s wrong? Tell us or add a photo." value={text} disabled={sending}
        onChange={e => { setText(e.target.value); draft.current = null; setError(""); }}
        onPaste={e => { const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith("image/")); if (file) { e.preventDefault(); void addImage(file); } }}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
        aria-describedby={error ? `${id}-error` : `${id}-note`} />
      {attachment && <div className={styles.attachment}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.preview} alt="Attachment preview" className={styles.preview} />
        <span className={styles.filename}>{attachment.file.name}</span>
        <button type="button" className={styles.iconButton} aria-label="Remove attachment" disabled={sending || preparing} onClick={() => { imageVersion.current++; setAttachment(null); draft.current = null; }}><X size={18} aria-hidden="true" /></button>
      </div>}
      <div className={styles.controls}>
        <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Photo or screenshot" disabled={sending || preparing}
          onChange={e => { void addImage(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        <button type="button" className={`${styles.iconButton} ${styles.add}`} aria-label={attachment ? "Replace photo or screenshot" : "Add photo or screenshot"} title="Add photo or screenshot" disabled={sending || preparing} onClick={() => fileInput.current?.click()}>
          {preparing ? <Loader2 className={styles.spinner} size={22} aria-hidden="true" /> : <Plus size={24} aria-hidden="true" />}
        </button>
        <button type="submit" className={`${styles.iconButton} ${styles.send}`} aria-label={sending ? "Sending report" : "Send report"} title="Send report" disabled={sending || preparing || (!text.trim() && !attachment)}>
          {sending ? <Loader2 className={styles.spinner} size={21} aria-hidden="true" /> : <ArrowUp size={23} aria-hidden="true" />}
        </button>
      </div>
    </div>
    {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    <p id={`${id}-note`} className={styles.note}>Reports may be public. <Link href="/privacy">Privacy</Link></p>
  </form>;
}
