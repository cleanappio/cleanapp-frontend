import React, { useState } from "react";
import useReportCounter from "../hooks/useReportCounter";
import AnimatedNumbers from "react-animated-numbers";

const ReportCounter = () => {
  const { reportCounter, isLoading, error, refetch } = useReportCounter();

  if (isLoading) {
    return (
      <div className="flex flex-row items-center justify-center py-1 px-2 gap-2 bg-gray-800 rounded-md border border-gray-700">
        <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
        <p className="text-white text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-row items-center justify-center py-1 px-2 gap-2 bg-gray-800 rounded-md border border-gray-700">
        <div className="w-1 h-1 bg-red-400 rounded-full"></div>
        <p className="text-white text-sm">Error loading reports</p>
        <button
          onClick={refetch}
          className="text-blue-400 hover:text-blue-300 text-xs underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-center py-1 px-2 gap-2 bg-gray-800 rounded-md border border-gray-700">
      <div className="w-1 h-1 bg-green-400 rounded-full"></div>
      <div className="flex flex-row items-center justify-center gap-1">
        <AnimatedNumbers
          useThousandsSeparator
          transitions={(index) => ({
            type: "keyframes",
            duration: index / 10 + 0.5,
          })}
          className="text-white text-sm mt-1"
          animateToNumber={reportCounter.total_reports}
        />
        <p className="text-white text-sm">reports</p>
      </div>
    </div>
  );
};

export default ReportCounter;
