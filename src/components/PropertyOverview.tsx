import React from "react";
import Image from "next/image";

const PropertyOverview = () => {
  return (
    <div className="border rounded-md bg-white shadow-md">
      <div className="p-4">
        <p className="text-lg font-medium">Property Overview</p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-500">
              Interactive map showing monitored areas and incident locations
            </p>
          </div>
        </div>
      </div>

      <div className="relative h-96">
        <Image
          src="/property-overview.avif"
          alt="Property Overview"
          width={1000}
          height={1000}
          className="w-full h-full rounded-b-md"
        />

        <div className="absolute top-16 left-24 w-56 h-40 bg-gradient-to-br from-green-400/70 to-green-600/60 rounded-lg border border-green-300/50"></div>
        <div className="absolute bottom-20 left-12 w-40 h-32 bg-gradient-to-br from-green-500/75 to-green-700/65 rounded-lg border border-green-300/50"></div>
        <div className="absolute top-12 right-16 w-48 h-36 bg-gradient-to-br from-green-300/65 to-green-500/55 rounded-lg border border-green-300/50"></div>

        <div
          className="absolute animate-pulse"
          style={{ top: "7rem", left: "10rem" }}
        >
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>

        <div
          className="absolute animate-pulse"
          style={{ bottom: "8rem", left: "6rem" }}
        >
          <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>

        <div
          className="absolute animate-pulse"
          style={{ top: "6rem", right: "8rem" }}
        >
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div
              className="absolute inset-0 bg-white rounded-xl opacity-20 animate-ping"
              style={{ animationDuration: "3s" }}
            ></div>
            <div
              className="absolute inset-0 bg-white rounded-xl opacity-15 animate-pulse"
              style={{ animationDuration: "4s" }}
            ></div>
            <button className="subscribe-button relative bg-gradient-to-r from-green-500 to-green-700 hover:from-green-500/90 hover:to-green-700/90 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 z-10">
              <span className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 3l14 9-14 9V3z"
                  ></path>
                </svg>
                Subscribe for Full Access
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyOverview;
