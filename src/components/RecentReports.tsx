import React from "react";
import { FaLock } from "react-icons/fa";
import Image from "next/image";

const RecentReports = () => {
  return (
    <div className="max-w-7xl mx-auto my-8">
      <h1 className="text-2xl font-medium mb-4">Recent Reports (48):</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-xl border border-gray-200 p-6">
        {/* Incidents Card */}

        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-lg font-medium">Incidents</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="relative">
              <Image
                src="/unsplash-1.avif"
                alt="Incident"
                width={400}
                height={160}
                className="rounded-t-xl w-full h-40 object-cover"
              />
              <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                High Priority
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-semibold text-lg mb-1">
                  Waste Management Issue
                </h2>
                <p className="text-gray-500 text-sm mb-2">
                  Reported: Jun 24, 2025, 2:00 PM
                </p>
                <p className="text-gray-700 text-sm mb-4">
                  Overflowing waste bins creating sanitation hazard
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full font-medium">
                  Sanitation
                </span>
                <span className="text-xs px-3 py-1 text-gray-500">
                  North Entrance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Locations Card */}
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-lg font-medium">Locations</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="rounded-t-xl w-full h-40 flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 relative">
              <span className="w-6 h-6 bg-red-500 rounded-full block"></span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-gray-700 text-sm mb-2 flex justify-between items-center">
                  <h2 className="font-semibold text-lg mb-1">North Entrance</h2>
                  <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-md">
                    Zone A-1
                  </span>
                </div>

                <div className="text-gray-500 text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Coordinates:
                  </span>
                  <span>47.3566,8.5696</span>
                </div>
                <div className="text-gray-500 text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Floor:</span>
                  <span>Ground Level</span>
                </div>
                <div className="text-gray-500 text-sm mb-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Area Type:
                  </span>
                  <span>Public Access</span>
                </div>
                <div className="text-sm text-red-500 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Risk Level:
                  </span>
                  <span>High Traffic</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ainsights Card */}
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 className="text-lg font-medium">AI Insights</h1>
          </div>

          <div className="bg-white rounded-xl shadow-dashed border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 h-full">
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-4 mb-4">
                <FaLock className="text-green-600 text-2xl" />
              </div>
              <h2 className="font-semibold text-lg mb-2">Premium Features</h2>
              <ul className="text-gray-700 text-xs mb-4 list-none space-y-1 text-center">
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span>{" "}
                  Predictive Risk Assessment
                </li>
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span> Cost
                  Impact Analysis
                </li>
                <li>
                  <span className="text-green-600 mr-2">&#10003;</span>{" "}
                  AI-Powered Recommendations
                </li>
              </ul>
              <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md transition-colors text-sm">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentReports;
