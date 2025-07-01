import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-white pt-8 pb-4 rounded-b-2xl shadow-sm mt-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col gap-6 md:flex-row justify-between items-center md:items-end text-center md:text-left mb-4">
          <div className="flex-1 flex flex-col items-center">
            <span className="text-green-600 text-3xl font-bold">23</span>
            <span className="text-gray-500 text-sm">Total Incidents</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-red-600 text-3xl font-bold">8</span>
            <span className="text-gray-500 text-sm">High Priority</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-green-600 text-3xl font-bold">15</span>
            <span className="text-gray-500 text-sm">Resolved</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-black text-3xl font-bold">
              4.2<span className="text-base font-normal">hrs</span>
            </span>
            <span className="text-gray-500 text-sm">Avg Resolution</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-green-600 text-3xl font-bold">
              4.8 <span className="text-gray-400 text-2xl">/ 5</span>
            </span>
            <span className="text-gray-500 text-sm">CleanApp Score</span>
          </div>
        </div>
        <hr className="my-4 border-gray-200" />
        <div className="text-center text-sm text-gray-500">
          Powered by{" "}
          <Link href={"https://www.stxn.io/"}>
            <span className=" text-green-700 hover:text-green-500">
              Smart Transactions (STXN)
            </span>
          </Link>{" "}
          &amp;{" "}
          <Link href={"https://www.cleanapp.io/"}>
            <span className=" text-green-700 hover:text-green-500">
              CleanApp
            </span>
          </Link>
          <br />
          <Link href={"https://cleanapppro.replit.app/google"}>
            <span className="text-green-700 hover:text-green-500">
              View sample Digital CleanApp Report
            </span>
          </Link>
          <span className="mx-2 text-gray-300">•</span>
          <Link href={"https://cleanapppro.replit.app/subscribed-sample"}>
            <span className="text-green-700 hover:text-green-500">
              View sample CleanAppPro subscriber dashboard
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
