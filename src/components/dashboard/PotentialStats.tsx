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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Your intelligence map</h3>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-medium">
            <Pause className="w-3 h-3" />
            <span>Tracking paused</span>
          </div>
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
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-default"
                      title="No alerts"
                    >
                      <MapPin className="w-3 h-3" />
                      {location.name}
                      <span className="text-xs text-blue-500/70 font-normal">· No alerts</span>
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
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-2">No recent activity yet</p>
            <p className="text-gray-400 text-xs">Search for brands or explore locations on the map to see your activity here</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">What you could unlock</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-sm text-gray-700">AI summaries for your tracked brands</p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm text-gray-700">Alerts for issues like the ones you viewed</p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm text-gray-700">Trend comparisons over time</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
          >
            View plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
