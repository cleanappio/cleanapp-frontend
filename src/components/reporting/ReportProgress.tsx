import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cruisePath, landingPath } from "@/lib/leaf-flight";
import styles from "./ReportComposer.module.css";

const MESSAGES = [
  "Analyzing your report with AI.",
  "Looking for similar reports.",
  "Finding patterns in related reports.",
  "Finding the right people to contact.",
  "Preparing the next steps for escalation.",
  "Updating your receipt and activity log.",
];

const CRUISE_MS = 7000;
const LANDING_MS = 3600;

/**
 * Flies the leaf (see src/lib/leaf-flight.ts for the paths).
 *
 * While `processing`, the leaf repeats the cruise circuit. When processing
 * ends it is never cut off mid-air: it finishes the circuit it is on, flies
 * once around the "Report something else" link (the element marked
 * `data-report-nudge` in the same receipt), and settles back in its corner.
 * A receipt that was never processing on this screen stays still. Nothing
 * moves under prefers-reduced-motion or without offset-path support.
 */
function useLeafFlight(processing: boolean, receiptId: string) {
  const mark = useRef<HTMLDivElement>(null);
  const leaf = useRef<HTMLSpanElement>(null);
  const cruise = useRef<Animation | null>(null);

  useEffect(() => {
    const markEl = mark.current;
    const leafEl = leaf.current;
    if (!markEl || !leafEl || typeof leafEl.animate !== "function") return;
    if (!CSS.supports("offset-path", "path('M 0 0 L 1 1')")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const receiptEl = markEl.parentElement;

    if (processing) {
      const home = cruisePath((receiptEl?.clientWidth ?? 320));
      leafEl.style.offsetPath = `path('${home}')`;
      leafEl.classList.add(styles.progressLeafFlying);
      cruise.current = leafEl.animate({ offsetDistance: ["0%", "100%"] }, { duration: CRUISE_MS, iterations: Infinity, easing: "linear" });
      // No cleanup: the next run of this effect lands the leaf gracefully.
      return;
    }

    const flying = cruise.current;
    cruise.current = null;
    if (!flying) return;
    let cancelled = false;
    let landing: Animation | null = null;
    // Let the current circuit finish instead of freezing mid-air.
    const flown = Number(flying.currentTime ?? 0);
    flying.effect?.updateTiming({ iterations: Math.max(1, Math.ceil(flown / CRUISE_MS)) });
    flying.finished.then(() => {
      if (cancelled) return;
      const nudge = receiptEl?.querySelector<HTMLElement>("[data-report-nudge]");
      if (!nudge) return;
      const from = markEl.getBoundingClientRect();
      const to = nudge.getBoundingClientRect();
      const path = landingPath({ left: to.left - from.left, top: to.top - from.top, width: to.width, height: to.height });
      landing = leafEl.animate(
        { offsetPath: [`path('${path}')`, `path('${path}')`], offsetDistance: ["0%", "100%"] },
        { duration: LANDING_MS, easing: "cubic-bezier(.4, 0, .25, 1)" },
      );
    }).catch(() => { /* cancelled */ });
    return () => { cancelled = true; flying.cancel(); landing?.cancel(); };
  }, [processing, receiptId]);

  return { mark, leaf };
}

/** A calm overview of the work, not a timed claim about backend stages. */
export default function ReportProgress({ processing, receiptId, title }: { processing: boolean; receiptId: string; title: string }) {
  const [message, setMessage] = useState(0);
  useEffect(() => {
    setMessage(0);
    if (!processing) return;
    const timer = setInterval(() => setMessage(current => (current + 1) % MESSAGES.length), 6000);
    return () => clearInterval(timer);
  }, [processing, receiptId]);
  const flight = useLeafFlight(processing, receiptId);

  return <>
    <div className={styles.progressMark} aria-hidden="true" ref={flight.mark}>
      <span className={styles.progressLeaf} ref={flight.leaf}>
        {/* Crop the wordmark from the existing transparent logo, retaining its leaf. */}
        <Image src="/cleanapp-logo.png" alt="" width={348} height={264} className={styles.progressLogo} />
      </span>
    </div>
    <h2 className={styles.progressTitle} role="status" aria-live="polite" aria-atomic="true">
      <span className="sr-only">{processing ? "Your report has been received and is processing." : title}</span>
      <span key={processing ? `${receiptId}-${message}` : title} className={processing ? styles.progressPhrase : undefined} aria-hidden="true">{processing ? MESSAGES[message] : title}</span>
    </h2>
  </>;
}
