import Navbar from "@/components/Navbar";
import PropertyOverview from "@/components/PropertyOverview";
import RecentReports from "@/components/RecentReports";
import Footer from "@/components/Footer";
import React from "react";
import { useRouter } from "next/router";
import { LatestReport } from "@/components/GlobeView";

const CleanAppPro = () => {
  const router = useRouter();
  let reportItem: LatestReport | null = null;
  if (typeof window !== "undefined" && router.query.report) {
    try {
      reportItem = JSON.parse(
        decodeURIComponent(router.query.report as string)
      );
    } catch (e) {
      reportItem = null;
    }
  }

  console.log({ reportItem });

  return (
    <div className="bg-gray-50 h-full">
      <div className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Navbar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 lg:mt-8">
        <PropertyOverview reportItem={reportItem} />
        <RecentReports reportItem={reportItem} />
      </div>
      <Footer />
    </div>
  );
};

export default CleanAppPro;
