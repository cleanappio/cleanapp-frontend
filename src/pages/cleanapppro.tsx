import Navbar from "@/components/Navbar";
import PropertyOverview from "@/components/PropertyOverview";
import RecentReports from "@/components/RecentReports";
import Footer from "@/components/Footer";
import React from "react";

const CleanAppPro = () => {
  return (
    <div className="bg-gray-50 h-full">
      <div className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Navbar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 lg:mt-8">
        <PropertyOverview />
        <RecentReports />
      </div>
      <Footer />
    </div>
  );
};

export default CleanAppPro;
