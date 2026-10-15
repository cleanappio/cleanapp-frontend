"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicDiscoveryCard } from "@/types/public-discovery";

type Props = {
  item: PublicDiscoveryCard;
  onOpen: () => void;
  className?: string;
};

export default function ReportThumbnail({ item, onOpen, className = "w-24 sm:w-40" }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const [requestedToken, setRequestedToken] = useState<string | null>(null);
  const [failedToken, setFailedToken] = useState<string | null>(null);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const token = item.discovery_token;
  const visible = Boolean(item.evidence?.has_original_media && token && failedToken !== token);

  useEffect(() => {
    if (!visible || !button.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setRequestedToken(token);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setRequestedToken(token);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(button.current);
    return () => observer.disconnect();
  }, [token, visible]);

  if (!visible) return null;
  return (
    <button
      ref={button}
      type="button"
      onClick={onOpen}
      aria-label={`Open report: ${item.title || "Report image"}`}
      className={`aspect-[4/3] shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50 transition-colors hover:border-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${className}`}
    >
      {requestedToken === token && (
        // A bounded same-origin thumbnail avoids downloading full report images into the list.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/reports/thumbnail?token=${encodeURIComponent(token)}`}
          alt={`Image attached to ${item.title || "this report"}`}
          width={336}
          height={252}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedToken(token)}
          onError={() => setFailedToken(token)}
          className={`h-full w-full object-contain transition-opacity ${loadedToken === token ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </button>
  );
}
