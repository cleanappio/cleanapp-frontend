import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import ReportComposer, { ReportReceipt } from "@/components/reporting/ReportComposer";
import { readReportReceipt, reportApiBase, type WebReportReceipt } from "@/lib/web-reporting";
import Link from "next/link";
import { breadcrumbJsonLd, jsonLdGraph, webPageJsonLd } from "@/lib/seo";

const title = "Report a Problem Online — Photo, Screenshot or Message | CleanApp";
const description = "Don’t know who to tell? Describe a problem or upload a photo or screenshot. Report issues in places, products, apps and websites with CleanApp.";

export default function ReportAProblemPage() {
  const router = useRouter();
  const receiptId = typeof router.query.receipt === "string" ? router.query.receipt : "";
  const [receipt, setReceipt] = useState<WebReportReceipt | null>(null);
  const [receiptError, setReceiptError] = useState("");
  useEffect(() => {
    if (!receiptId) { setReceipt(null); setReceiptError(""); return; }
    let active = true;
    setReceipt(null); setReceiptError("");
    if (!/^[a-zA-Z0-9_-]{8,160}$/.test(receiptId)) { setReceiptError("That receipt link is incomplete."); return; }
    void fetch(`${reportApiBase()}/receipts/${encodeURIComponent(receiptId)}`, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(15_000) })
      .then(async res => { if (!res.ok) throw new Error("We couldn’t load that receipt. Please try again shortly."); const data = readReportReceipt(await res.json()); if (!data) throw new Error("We couldn’t load that receipt."); if (active) setReceipt(data); })
      .catch(err => { if (active) setReceiptError(err instanceof Error ? err.message : "We couldn’t load that receipt."); });
    return () => { active = false; };
  }, [receiptId]);
  return <>
    <Seo title={title} description={description} path="/report-a-problem" noindex={Boolean(receiptId)} jsonLd={jsonLdGraph([
      webPageJsonLd({ path: "/report-a-problem", title, description }),
      breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Report a problem", path: "/report-a-problem" }]),
    ])} />
    <div className="min-h-screen bg-[#fafcf9] text-gray-900">
      <PageHeader />
      <section className="mx-auto max-w-xl px-6 pt-16 pb-20 sm:pt-24">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">Don’t know who to tell?</h1>
        <p className="mt-4 mb-9 text-lg text-gray-600">Tell CleanApp.</p>
        {receiptId ? <div aria-live="polite">{receipt ? <ReportReceipt receipt={receipt} /> : <p className="text-gray-600" role={receiptError ? "alert" : "status"}>{receiptError || "Loading your receipt…"}</p>}<Link href="/report-a-problem" className="mt-6 inline-block text-green-800 underline underline-offset-4">Report a problem</Link></div> : <ReportComposer />}
        <p className="mt-10 text-sm text-gray-600 leading-relaxed">A problem in your neighborhood, a building, a product, an app or a website. Describe what happened; add a location or link if it helps.</p>
      </section>
      <Footer />
    </div>
  </>;
}
