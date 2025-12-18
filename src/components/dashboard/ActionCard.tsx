import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { MapPin, Building2, Globe, Search, X, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { useBackendSearch } from '@/hooks/useBackendSearch';

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
      <div className="flex flex-col items-center p-6 bg-white/20 rounded-xl transition-all duration-300 shadow-lg border-2 border-white/50 w-full min-h-[180px]">
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center p-6 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 border-white/30 hover:border-white/50 w-full"
    >
      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors border border-white/20">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <span className="text-white font-semibold text-lg mb-1">{label}</span>
      <span className="text-white/70 text-sm text-center mb-2">{description}</span>
      <span className="text-white/50 text-xs italic">{example}</span>
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
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-brand?brand_name=${encodeURIComponent(searchTerm)}&n=1`
        );

        if (!response.ok) {
          setMatchingBrand(null);
          return;
        }

        const data = await response.json();

        if (data.reports && data.reports.length > 0) {
          const firstReport = data.reports[0];
          const analysis = firstReport.analysis?.[0];
          const brandName = analysis?.brand_name || searchTerm;
          const actualTotal = data.total_count || data.count || data.reports.length;

          setMatchingBrand({
            brand_name: brandName,
            brand_display_name: analysis?.brand_display_name || analysis?.brand_name || searchTerm,
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

  const handleBrandClick = (brandName: string) => {
    router.push(`/digital/${brandName}`);
  };

  return (
    <div className="bg-gradient-to-r from-green-600 via-green-600 to-emerald-600 rounded-2xl p-8 mb-8 shadow-xl relative">
      <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
        Choose how you want to use CleanApp
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionButton
          icon={MapPin}
          label="Monitor a location"
          description="Track reports in your area"
          example="e.g. campuses, offices, neighborhoods"
          onClick={() => router.push('/')}
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
              <div className="relative w-full mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Enter brand name..."
                  className="w-full bg-white/10 border-2 border-white/30 rounded-lg py-2 pl-10 pr-10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-all"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Results Dropdown-style */}
              {(searchTerm.length >= 2) && (
                <div className="absolute top-[85%] left-0 right-0 z-50 bg-gray-900 rounded-xl border border-white/20 shadow-2xl overflow-hidden mt-1 max-h-60 overflow-y-auto">
                  {matchingBrand && (
                    <button
                      className="p-4 bg-gradient-to-r from-green-900/40 to-gray-800 text-left w-full hover:from-green-800/40 hover:to-gray-700 transition-all group flex items-center justify-between border-b border-white/10"
                      onClick={() => handleBrandClick(matchingBrand.brand_name)}
                    >
                      <div>
                        <p className="text-white font-semibold">{matchingBrand.brand_display_name} Dashboard</p>
                        <p className="text-green-400 text-xs">{matchingBrand.total.toLocaleString()} reports</p>
                      </div>
                      <ArrowRight className="text-gray-400 group-hover:text-green-400 w-5 h-5 transition-colors" />
                    </button>
                  )}

                  {searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <button
                        key={result.report.seq}
                        className="p-3 text-left text-gray-200 hover:bg-white/10 w-full text-sm border-b border-white/5 last:border-none"
                        onClick={() => handleBrandClick(result.analysis?.[0]?.brand_name || searchTerm)}
                      >
                        <p className="line-clamp-1 opacity-80">{result.analysis?.[0]?.title || `Report #${result.report.seq}`}</p>
                      </button>
                    ))
                  ) : !matchingBrand && !searchLoading && (
                    <div className="p-4 text-white/50 text-sm text-center italic">
                      No brands found for "{searchTerm}"
                    </div>
                  )}

                  {searchLoading && (
                    <div className="p-4 text-white/50 text-sm text-center">
                      Searching...
                    </div>
                  )}
                </div>
              )}
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
    </div>
  );
}
