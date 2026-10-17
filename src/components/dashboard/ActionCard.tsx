import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { MapPin, Building2, Globe, Search, X, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { useBackendSearch } from '@/hooks/useBackendSearch';
import { useUserActivityStore } from '@/lib/user-activity-store';
import { fetchPublicBrandReports } from '@/lib/public-discovery-api';

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  example: string;
  onClick: () => void;
  isActive?: boolean;
  children?: React.ReactNode;
}

function ActionButton({ icon: Icon, label, description, example, onClick, isActive, children }: ActionButtonProps) {
  if (isActive) {
    return (
      <div className="relative flex flex-col h-full p-6 bg-white rounded-2xl border border-green-600 ring-1 ring-green-600 shadow-lg shadow-green-100 w-full min-h-[204px]">
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group flex flex-col h-full text-left p-6 bg-white rounded-2xl border border-gray-200 transition-all duration-200 hover:border-green-600 hover:shadow-lg hover:shadow-green-100 w-full min-h-[204px]"
    >
      <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-600 transition-colors">
        <Icon className="w-5 h-5 text-green-700 group-hover:text-white transition-colors" />
      </div>
      <span className="text-gray-900 font-bold text-lg">{label}</span>
      <span className="mt-1 text-gray-600 text-sm">{description}</span>
      <span className="mt-auto pt-4 flex items-center justify-between text-gray-400 text-xs">
        {example}
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
      </span>
    </button>
  );
}

export default function ActionCard() {
  const router = useRouter();
  const { t } = useTranslations();
  const [isBrandSearchOpen, setIsBrandSearchOpen] = useState(false);
  const { searchTerm, setSearchTerm, searchResults, loading: searchLoading, error: searchError } = useBackendSearch("digital");
  const [matchingBrand, setMatchingBrand] = useState<{
    brand_name: string;
    brand_display_name: string;
    total: number;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (isBrandSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isBrandSearchOpen]);

  // Brand matching logic copied from GlobeView
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setMatchingBrand(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const data = await fetchPublicBrandReports(searchTerm, 'en', 1, { kind: 'all' });

        if (data.items && data.items.length > 0) {
          const firstReport = data.items[0];
          const brandName = data.scope?.brand_name || firstReport.brand_name || searchTerm;
          const firstMatchesScope = !data.scope?.brand_name || firstReport.brand_name?.toLowerCase() === brandName.toLowerCase();
          const scopeDisplayName = searchTerm.trim().toLowerCase() === brandName.toLowerCase() ? searchTerm.trim() : brandName;
          const actualTotal = data.total_count || data.count || data.items.length;

          setMatchingBrand({
            brand_name: brandName,
            brand_display_name: firstMatchesScope
              ? firstReport.brand_display_name || firstReport.brand_name || searchTerm
              : scopeDisplayName,
            total: actualTotal,
          });
        } else {
          setMatchingBrand(null);
        }
      } catch (error) {
        console.error('Error checking brand dashboard:', error);
        setMatchingBrand(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Track user activity for dashboard personalization
  const trackBrandSearch = useUserActivityStore((state) => state.trackBrandSearch);

  const handleBrandClick = (brandName: string, displayName?: string) => {
    console.log('[UserActivity] Tracking brand from ActionCard:', displayName || brandName);
    trackBrandSearch(displayName || brandName);
    router.push(`/digital/${brandName}`);
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Choose how you want to use CleanApp
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <ActionButton
          icon={MapPin}
          label="Monitor a location"
          description="Track reports in your area"
          example="e.g. campuses, offices, neighborhoods"
          onClick={() => router.push('/?tutorial=location')}
        />

        <div className="relative">
          <ActionButton
            icon={Building2}
            label="Track a brand"
            description="Follow issues for any product"
            example="e.g. Airbnb, TikTok, Uber"
            onClick={() => setIsBrandSearchOpen(true)}
            isActive={isBrandSearchOpen}
          >
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-11 h-11 bg-green-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-900 font-bold text-lg">Track a brand</span>
              </div>
              <div className="relative w-full mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Enter brand name..."
                  className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsBrandSearchOpen(false);
                      setSearchTerm("");
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBrandSearchOpen(false);
                    setSearchTerm("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Search Results Dropdown-style */}
                {(searchTerm.length >= 2) && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden mt-2 max-h-60 overflow-y-auto">
                    {matchingBrand && (
                      <button
                        className="p-4 bg-green-50 text-left w-full hover:bg-green-100 transition-colors group flex items-center justify-between border-b border-gray-100"
                        onClick={() => handleBrandClick(matchingBrand.brand_name, matchingBrand.brand_display_name)}
                      >
                        <div>
                          <p className="text-gray-900 font-semibold">{matchingBrand.brand_display_name} Dashboard</p>
                          <p className="text-green-700 text-xs">{matchingBrand.total.toLocaleString()} reports</p>
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-green-600 w-5 h-5 transition-colors" />
                      </button>
                    )}

                    {searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.discovery_token}
                          className="p-3 text-left text-gray-700 hover:bg-gray-50 w-full text-sm border-b border-gray-100 last:border-none"
                          onClick={() =>
                            handleBrandClick(
                              result.brand_name || searchTerm,
                              result.brand_display_name || result.brand_name || searchTerm,
                            )
                          }
                        >
                          <p className="line-clamp-1">
                            {result.title || result.brand_display_name || result.brand_name || "Report"}
                          </p>
                        </button>
                      ))
                    ) : !matchingBrand && !searchLoading && (
                      <div className="p-4 text-gray-500 text-sm text-center">
                        No brands found for &quot;{searchTerm}&quot;
                      </div>
                    )}

                    {searchLoading && (
                      <div className="p-4 text-gray-500 text-sm text-center">
                        Searching...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ActionButton>
        </div>

        <ActionButton
          icon={Globe}
          label="Explore live reports"
          description="See what's happening now"
          example="e.g. today's most reported issues"
          onClick={() => router.push('/')}
        />
      </div>
    </section>
  );
}
