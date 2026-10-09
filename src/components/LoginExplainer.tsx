import { Building2, MapPin, Radar, Camera } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

/**
 * Left-hand panel on the login page: why an organization signs in.
 * Pure presentation; no data fetching.
 */
export default function LoginExplainer() {
  const { t } = useTranslations();

  const points = [
    { icon: Building2, title: t("loginPointBrandTitle"), body: t("loginPointBrandBody") },
    { icon: MapPin, title: t("loginPointPlacesTitle"), body: t("loginPointPlacesBody") },
    { icon: Radar, title: t("loginPointSignalTitle"), body: t("loginPointSignalBody") },
  ];

  return (
    <section className="flex flex-col justify-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
        {t("loginHeadline")}
      </h1>
      <p className="mt-4 text-gray-600 leading-relaxed max-w-md">{t("loginSubhead")}</p>

      {/* Illustrative report card: photo in, structured signal out. */}
      <div className="mt-8 max-w-sm rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="relative h-28 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300">
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Camera className="h-7 w-7" aria-hidden="true" />
          </div>
          <span className="absolute top-2 left-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 bg-white/80 rounded px-1.5 py-0.5">
            {t("loginSampleLabel")}
          </span>
          <span className="absolute top-2 right-2 text-[11px] text-gray-500 bg-white/80 rounded px-1.5 py-0.5">
            {t("loginSampleTime")}
          </span>
        </div>
        <div className="p-4">
          <p className="font-semibold text-gray-900">{t("loginSampleTitle")}</p>
          <p className="mt-1 text-sm text-gray-500">{t("loginSampleMeta")}</p>
          <div className="mt-3 flex gap-2">
            <span className="inline-block h-1.5 w-10 rounded-full bg-red-500" aria-hidden="true" />
            <span className="inline-block h-1.5 w-10 rounded-full bg-amber-400" aria-hidden="true" />
            <span className="inline-block h-1.5 w-10 rounded-full bg-gray-200" aria-hidden="true" />
          </div>
        </div>
      </div>

      <ul className="mt-8 space-y-5 max-w-md">
        {points.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
