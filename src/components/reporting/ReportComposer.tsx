import { useEffect, useId, useRef, useState } from "react";
import { ArrowUp, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { MAX_REPORT_PHOTOS, newWebReportPayload, prepareReportPhotos, readReportReceipt, reportApiBase, submissionError, trackReportEvent, validateReportDraft, type WebReportPayload, type WebReportReceipt } from "@/lib/web-reporting";
import styles from "./ReportComposer.module.css";
import ReportProgress from "./ReportProgress";
import ReceiptStatus from "./ReceiptStatus";

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
    <ReceiptStatus receipt={receipt} processing={processing} review={review} surface={surface} />
    <div className={styles.receiptActions}>
      {receipt.canonical_path && <Link className={styles.link} href={receipt.canonical_path}>View report</Link>}
      {/* One click to the report once it exists. The widget offers the receipt
          link only while there is no report to open yet; the page always does. */}
      {(surface !== "widget" || !receipt.canonical_path) && <Link className={styles.link} href={`/report-a-problem?receipt=${encodeURIComponent(receipt.receipt_id)}`}>Keep your receipt</Link>}
      {onAnother && <button type="button" data-report-nudge className={`${styles.link} ${styles.nudge}`} onClick={onAnother}>Report something else</button>}
    </div>
  </div>;
}

export function useReportComposerState() {
  const [text, setText] = useState("");
  // Up to MAX_REPORT_PHOTOS photos, in the order added. `images` holds the
  // prepared (re-encoded) photos for exactly this list of files.
  const [attachments, setAttachments] = useState<{ files: { file: File; preview: string }[]; images: string[] }>({ files: [], images: [] });
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
  const previews = useRef(new Set<string>());
  useEffect(() => {
    // Release previews that are no longer shown; release all on unmount.
    const current = new Set(attachments.files.map(item => item.preview));
    previews.current.forEach(url => { if (!current.has(url)) URL.revokeObjectURL(url); });
    previews.current = current;
  }, [attachments]);
  useEffect(() => () => { previews.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  return { text, setText, attachments, setAttachments, preparing, setPreparing, sending, setSending, error, setError, receipt, setReceipt, fileInput, draft, locked, mounted, imageVersion };
}

export default function ReportComposer({ surface = "page", state }: { surface?: "widget" | "page"; state?: ReturnType<typeof useReportComposerState> }) {
  const id = useId();
  const localState = useReportComposerState();
  const { text, setText, attachments, setAttachments, preparing, setPreparing, sending, setSending, error, setError, receipt, setReceipt, fileInput, draft, locked, mounted, imageVersion } = state || localState;

  const photoCount = attachments.files.length;

  // Every change re-prepares the whole set: the byte budget per photo depends
  // on how many photos there are. A newer change supersedes an older one.
  async function setPhotos(next: { file: File; preview: string }[], notice = "") {
    const version = ++imageVersion.current;
    setPreparing(true); setError(notice);
    try {
      const images = await prepareReportPhotos(next.map(item => item.file));
      if (mounted.current && version === imageVersion.current) {
        setAttachments({ files: next, images });
        draft.current = null;
      } else {
        next.forEach(item => { if (!attachments.files.includes(item)) URL.revokeObjectURL(item.preview); });
      }
    } catch (err) {
      // The set on screen stays as it was; drop previews made for this attempt.
      next.forEach(item => { if (!attachments.files.includes(item)) URL.revokeObjectURL(item.preview); });
      if (mounted.current && version === imageVersion.current) setError(err instanceof Error ? err.message : "We couldn’t open that image.");
    } finally {
      if (mounted.current && version === imageVersion.current) setPreparing(false);
    }
  }

  function addImages(list?: FileList | File[] | null) {
    const incoming = Array.from(list || []).filter(file => file.type.startsWith("image/") || file.type === "");
    if (!incoming.length || locked.current || preparing) return;
    const room = MAX_REPORT_PHOTOS - photoCount;
    const accepted = incoming.slice(0, Math.max(0, room));
    const notice = incoming.length > accepted.length ? `A report can have up to ${MAX_REPORT_PHOTOS} photos.` : "";
    if (!accepted.length) { setError(notice); return; }
    void setPhotos([...attachments.files, ...accepted.map(file => ({ file, preview: URL.createObjectURL(file) }))], notice);
  }

  function removeImage(index: number) {
    const next = attachments.files.filter((_, i) => i !== index);
    if (!next.length) { imageVersion.current++; setAttachments({ files: [], images: [] }); draft.current = null; setError(""); return; }
    void setPhotos(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (locked.current || preparing) return;
    const issue = validateReportDraft(text, photoCount > 0);
    if (issue) { setError(issue); return; }
    locked.current = true; setSending(true); setError("");
    try {
      // Retry the identical payload after network errors to avoid duplicate reports.
      draft.current ||= newWebReportPayload(text, attachments.images);
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
        setReceipt(accepted); setText(""); setAttachments({ files: [], images: [] }); draft.current = null;
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
    <div className={styles.box} onDragOver={e => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (!sending) addImages(e.dataTransfer.files); }}>
      <label htmlFor={`${id}-message`} className="sr-only">What’s wrong?</label>
      <textarea id={`${id}-message`} className={styles.textarea} placeholder="What’s wrong? Tell us or add a photo." value={text} disabled={sending}
        onChange={e => { setText(e.target.value); draft.current = null; setError(""); }}
        onPaste={e => { const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/")); if (files.length) { e.preventDefault(); addImages(files); } }}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
        aria-describedby={error ? `${id}-error` : `${id}-note`} />
      {photoCount > 0 && <ul className={styles.attachments} aria-label={`${photoCount} of ${MAX_REPORT_PHOTOS} photos added`}>
        {attachments.files.map((item, index) => <li key={item.preview} className={styles.thumb}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.preview} alt={`Photo ${index + 1}: ${item.file.name}`} className={styles.thumbImage} />
          <button type="button" className={styles.thumbRemove} aria-label={`Remove photo ${index + 1}`} disabled={sending || preparing} onClick={() => removeImage(index)}><X size={14} aria-hidden="true" /></button>
        </li>)}
      </ul>}
      <div className={styles.controls}>
        <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label="Photos or screenshots" disabled={sending || preparing}
          onChange={e => { addImages(e.target.files); e.currentTarget.value = ""; }} />
        <button type="button" className={`${styles.iconButton} ${styles.add}`} aria-label={photoCount ? `Add another photo (${photoCount} of ${MAX_REPORT_PHOTOS})` : "Add photos or screenshots"} title={photoCount >= MAX_REPORT_PHOTOS ? `Up to ${MAX_REPORT_PHOTOS} photos` : "Add photos or screenshots"} disabled={sending || preparing || photoCount >= MAX_REPORT_PHOTOS} onClick={() => fileInput.current?.click()}>
          {preparing ? <Loader2 className={styles.spinner} size={22} aria-hidden="true" /> : <Plus size={24} aria-hidden="true" />}
        </button>
        <button type="submit" className={`${styles.iconButton} ${styles.send}`} aria-label={sending ? "Sending report" : "Send report"} title="Send report" disabled={sending || preparing || (!text.trim() && photoCount === 0)}>
          {sending ? <Loader2 className={styles.spinner} size={21} aria-hidden="true" /> : <ArrowUp size={23} aria-hidden="true" />}
        </button>
      </div>
    </div>
    {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    <p id={`${id}-note`} className={styles.note}>Reports may be public. <Link href="/privacy">Privacy</Link></p>
  </form>;
}
