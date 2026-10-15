import * as Dialog from "@radix-ui/react-dialog";
import { MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";
import ReportComposer, { useReportComposerState } from "./ReportComposer";
import { trackReportEvent } from "@/lib/web-reporting";
import styles from "./ReportComposer.module.css";

export default function ReportWidget() {
  const [open, setOpen] = useState(false);
  const composerState = useReportComposerState();
  if (process.env.NEXT_PUBLIC_EMBEDDED_MODE === "true") return null;
  return <Dialog.Root open={open} onOpenChange={value => { setOpen(value); if (value) trackReportEvent("report_composer_opened", "widget"); }}>
    <Dialog.Trigger asChild>
      <button className={styles.launcher} aria-label="Report a problem"><MessageSquarePlus size={22} aria-hidden="true" /><span>Report a problem</span></button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.panel} aria-describedby={undefined} onOpenAutoFocus={event => {
        event.preventDefault(); document.querySelector<HTMLTextAreaElement>("[role='dialog'] textarea")?.focus();
      }}>
        <div className={styles.header}><Dialog.Title className={styles.title}>CleanApp’s on the case.</Dialog.Title>
          <Dialog.Close asChild><button type="button" className={`${styles.iconButton} ${styles.close}`} aria-label="Close reporting"><X size={20} aria-hidden="true" /></button></Dialog.Close>
        </div>
        <ReportComposer surface="widget" state={composerState} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
