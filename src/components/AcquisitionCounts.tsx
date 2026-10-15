import { useEffect } from "react";
import { useRouter } from "next/router";
import { ACQUISITION_EVENTS, acquisitionPage, countAcquisition } from "@/lib/acquisition";

export default function AcquisitionCounts() {
  const router = useRouter();
  useEffect(() => {
    let lastPath = "";
    const view = () => {
      const pathname = window.location.pathname;
      // Map tabs and the homepage's initial shallow redirect share one page.
      if (pathname === lastPath) return;
      lastPath = pathname;
      countAcquisition("page_view");
    };
    const report = (event: globalThis.Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail && ACQUISITION_EVENTS.includes(detail.event) && ["widget", "page"].includes(detail.surface)) countAcquisition(detail.event, detail.surface);
    };
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const page = acquisitionPage(window.location.pathname);
      if (page === "company" && /^mailto:info@cleanapp\.io(?:\?|$)/i.test(href)) countAcquisition(anchor.getAttribute("data-contact-purpose") === "investor" ? "investor_contact_interest" : "company_contact_interest");
      else if (/^\/pricing(?:[?#]|$)/.test(href) ||
        (/^\/signup(?:[?#]|$)/.test(href) && page && ["pricing", "solution_brands", "solution_cities", "solution_property", "solution_safety"].includes(page))) countAcquisition("organization_interest");
    };
    view();
    router.events.on("routeChangeComplete", view);
    window.addEventListener("cleanapp:report", report);
    document.addEventListener("click", click);
    return () => {
      router.events.off("routeChangeComplete", view);
      window.removeEventListener("cleanapp:report", report);
      document.removeEventListener("click", click);
    };
  }, [router.events]);
  return null;
}
