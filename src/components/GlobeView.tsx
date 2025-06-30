"use client";

import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { FiMenu } from "react-icons/fi";

export default function GlobeView() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [selectedTab, setSelectedTab] = useState<"physical" | "digital">(
    "physical"
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen relative">
      <main className="mainStyle">
        <Map
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          projection="globe"
          maxZoom={30}
          minZoom={1}
          antialias={true}
        ></Map>
      </main>

      {/* Logo */}
      <div className="absolute top-0 left-0 p-2">
        <Link href="/" className="flex items-center">
          <Image
            src="/cleanapp-logo.png"
            alt="CleanApp Logo"
            width={200}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Right side menu */}
      <div className="absolute top-2 right-2 flex flex-col items-end">
        <button
          className="p-3 bg-gray-800 rounded-md"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <FiMenu className="text-gray-300" size={24} />
        </button>

        <div
          className={`px-3 py-2 bg-gray-900 rounded-md mt-2 flex flex-col gap-2 transition-all duration-300 ${
            isMenuOpen ? "block" : "hidden"
          }`}
        >
          {[
            "Install",
            "Subscribe",
            "History",
            "CleanAppMap",
            "CleanAppGPT",
            "STXN",
          ].map((item) => {
            return (
              <p
                key={item}
                className="text-gray-300 cursor-pointer px-4 py-2 hover:bg-gray-800 rounded-md"
              >
                {item.toUpperCase()}
              </p>
            );
          })}
        </div>
      </div>

      {/* Center menu */}
      <div className="absolute left-1/2 -translate-x-1/2 p-2">
        <div className="flex gap-2 rounded-full bg-black text-gray-400 p-1 border border-gray-500">
          <p
            className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
              selectedTab === "physical"
                ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedTab("physical")}
          >
            PHYSICAL
          </p>
          <p
            className={`text-sm cursor-pointer rounded-full px-4 py-2 font-bold ${
              selectedTab === "digital"
                ? "text-gray-800 bg-gray-400 hover:bg-gray-400"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedTab("digital")}
          >
            DIGITAL
          </p>
        </div>
      </div>

      {/* Latest Reports */}
      <div className="absolute left-0 bottom-20 p-2">
        {/* Create translucent div with a gradient */}
        <div className="w-full h-full bg-gradient-to-b from-[#333333] to-black text-white px-3 py-2 border border-slate-400 rounded-lg text-center">
          <p className="text-slate-300">Latest Reports</p>

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex flex-col gap-1 text-sm border border-slate-600 p-2 rounded-md mt-2 items-start text-slate-300"
            >
              <p>Google Ads Bug, 12 seconds ago</p>
              <p className="text-xs">San Francisco, CA</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
