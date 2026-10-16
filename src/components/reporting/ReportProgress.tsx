import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./ReportComposer.module.css";

const MESSAGES = [
  "Analyzing your report with AI.",
  "Looking for similar reports.",
  "Finding patterns in related reports.",
  "Finding the right people to contact.",
  "Preparing the next steps for escalation.",
  "Updating your receipt and activity log.",
];

/** A calm overview of the work, not a timed claim about backend stages. */
export default function ReportProgress({ processing, receiptId, title }: { processing: boolean; receiptId: string; title: string }) {
  const [message, setMessage] = useState(0);
  useEffect(() => {
    setMessage(0);
    if (!processing) return;
    const timer = setInterval(() => setMessage(current => (current + 1) % MESSAGES.length), 6000);
    return () => clearInterval(timer);
  }, [processing, receiptId]);

  return <>
    <div className={styles.progressMark} aria-hidden="true">
      <span className={`${styles.progressLeaf} ${processing ? styles.progressLeafMoving : ""}`}>
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
