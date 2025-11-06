import { useMemo } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslations } from "@/lib/i18n";
import CustomAreaDashboard from "../components/CustomAreaDashboard";
import Head from "next/head";

export default function EdgeCityDashboard() {
  const router = useRouter();
  // Only subscribe to the specific auth state properties we need
  const isLoading = useAuthStore((state) => state.isLoading);
  const { t } = useTranslations();

  // Memoize the map center to prevent unnecessary re-renders
  const mapCenter = useMemo(
    () => [-40.1284469, -71.3460176] as [number, number],
    []
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t("edgeCityDashboard")} - CleanApp</title>
        <meta name="description" content={t("edgeCityReports")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <CustomAreaDashboard
        apiUrl={process.env.NEXT_PUBLIC_EDGE_CITY_API_URL || ""}
        mapCenter={mapCenter}
        areaName="Edge City"
        areaFlag="🇦🇷" // Argentina flag
        areaZoom={11}
        requiresAuth={false}
      />
    </>
  );
}
