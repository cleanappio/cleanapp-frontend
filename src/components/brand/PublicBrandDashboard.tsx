"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslations } from "@/lib/i18n";
import { resolvePublicDiscoveryToken } from "@/lib/public-discovery-api";
import { PublicDiscoveryCard } from "@/types/public-discovery";

type PublicBrandDashboardProps = {
  items: PublicDiscoveryCard[];
};

export default function PublicBrandDashboard({
  items,
}: PublicBrandDashboardProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleOpen = async (item: PublicDiscoveryCard) => {
    const resolved = await resolvePublicDiscoveryToken(item.discovery_token);
    if (resolved.canonical_path) {
      await router.push(resolved.canonical_path);
    }
  };

  const handleCopyUrl = async (item: PublicDiscoveryCard) => {
    const resolved = await resolvePublicDiscoveryToken(item.discovery_token);
    if (!resolved.canonical_path) {
      return;
    }

    const target = `${window.location.origin}${resolved.canonical_path}`;
    await navigator.clipboard.writeText(target);
    setCopiedToken(item.discovery_token);
    window.setTimeout(() => {
      setCopiedToken((current) =>
        current === item.discovery_token ? null : current,
      );
    }, 2000);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {items.slice(0, 6).map((item) => (
          <div
            key={item.discovery_token}
            className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow"
          >
            <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-base sm:text-lg mb-1">
                    {item.title || t("report")}
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleString()
                      : t("unknown")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    void handleCopyUrl(item);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label={t("copyUrl") || "Copy URL"}
                >
                  {copiedToken === item.discovery_token ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <p className="text-gray-700 text-sm leading-6 line-clamp-4">
                {item.summary || t("noDescriptionAvailable")}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                  {(item.brand_display_name || item.brand_name || "DIGITAL").toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {Math.round(item.severity_level * 100)}%
                </span>
              </div>

              <button
                className="mt-2 bg-gradient-to-r from-green-600 to-green-400 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 transition-all text-sm"
                onClick={() => {
                  void handleOpen(item);
                }}
              >
                {t("readReport") || "Read report"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 6 && (
        <div className="text-center bg-white mt-8 p-4 rounded-md border border-gray-200">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-row items-center justify-center gap-1">
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
              <span className="bg-gray-500 rounded-full w-2 h-2"></span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm">
              {t("moreReports")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
