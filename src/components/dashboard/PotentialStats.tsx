"use client";

import { Search, MapPin, Sparkles, Bell, TrendingUp, ArrowRight, Pause } from 'lucide-react';
import Link from 'next/link';
import { useUserActivityStore } from '@/lib/user-activity-store';
import { useEffect, useState } from 'react';

export default function PotentialStats() {
  const [mounted, setMounted] = useState(false);
  const getRecentBrands = useUserActivityStore((state) => state.getRecentBrands);
  const getRecentLocations = useUserActivityStore((state) => state.getRecentLocations);
  const clearActivity = useUserActivityStore((state) => state.clearActivity);

  useEffect(() => {
    setMounted(true);
  }, []);

  const recentBrands = mounted ? getRecentBrands(7) : [];
  const recentLocations = mounted ? getRecentLocations(7) : [];
  const hasActivity = recentBrands.length > 0 || recentLocations.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-green-700" />
            <h3 className="text-lg font-semibold text-gray-900">Your intelligence map</h3>
          </div>
          {hasActivity && (
            <div className="flex shrink-0 items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-medium">
              <Pause className="w-3 h-3" />
              <span>Tracking paused</span>
            </div>
          )}
        </div>

        {hasActivity ? (
          <div className="space-y-4">
            {recentBrands.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Brands you explored over the last 7 days</p>
                <div className="flex flex-wrap gap-2">
                  {recentBrands.slice(0, 5).map((brand) => (
                    <Link
                      key={brand.name}
                      href={`/digital/${encodeURIComponent(brand.name.toLowerCase())}`}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:shadow-md transition-all cursor-pointer"
                      title={`View ${brand.name} reports`}
                    >
                      {brand.name}
                      <span className="text-xs text-green-500/70 font-normal">· Not tracked</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recentLocations.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Locations you viewed</p>
                <div className="flex flex-wrap gap-2">
                  {recentLocations.slice(0, 5).map((location) => (
                    <span
                      key={location.name}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors cursor-default"
                      title="No alerts"
                    >
                      <MapPin className="w-3 h-3" />
                      {location.name}
                      <span className="text-xs text-gray-400 font-normal">· No alerts</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-3">
                Upgrade to continuously track the brands and locations you explored.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    clearActivity();
                    window.location.reload();
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear activity history
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 text-center px-4 py-8">
            <p className="text-gray-700 text-sm font-medium mb-1">No recent activity yet</p>
            <p className="text-gray-500 text-xs">Search for brands or explore locations on the map to see your activity here</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-green-700" />
          <h3 className="text-lg font-semibold text-gray-900">What you could unlock</h3>
        </div>

        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-green-700" />
            </div>
            <p className="text-sm text-gray-700">AI summaries for your tracked brands</p>
          </li>

          <li className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-green-700" />
            </div>
            <p className="text-sm text-gray-700">Alerts for issues like the ones you viewed</p>
          </li>

          <li className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-700" />
            </div>
            <p className="text-sm text-gray-700">Trend comparisons over time</p>
          </li>
        </ul>

        <div className="mt-auto pt-6">
          <Link
            href="/pricing"
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black transition-colors"
          >
            View plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
