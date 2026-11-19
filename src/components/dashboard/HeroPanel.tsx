import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import useReportCounter from '@/hooks/useReportCounter';

interface BrandSummary {
  brand_name: string;
  brand_display_name: string;
  total: number;
}

// Curated intelligence variations for the carousel
const INTELLIGENCE_WORDS = [
  'BRAND',
  'LOCATION',
  'PRODUCT',
  'SERVICE',
  'CAMPUS',
  'BUG',
  'DEFECT',
  'HAZARD',
  'SAFETY',
  'QUALITY',
  'CUSTOMER',
  'APP',
  'SOFTWARE',
  'WEBSITE',
  'PLATFORM',
  'MOBILE',
  'ENTERPRISE',
  'RETAIL',
  'RESTAURANT',
  'HOTEL',
  'TRAVEL',
  'HEALTHCARE',
  'EDUCATION',
  'TRANSPORT',
  'LOGISTICS',
  'DELIVERY',
  'ECOMMERCE',
  'SOCIAL',
  'UTILITY',
  'INSURANCE',
  'REAL ESTATE',
  'TECH',
  'CORPORATE',
  'CIVIC',
];

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Rounds down so the "+" is always true: 1,091,281 -> "1.09M+", 188,962 -> "188K+".
function formatFloor(num: number): string {
  if (num >= 1_000_000) return `${(Math.floor(num / 10_000) / 100).toFixed(2)}M+`;
  if (num >= 1_000) return `${Math.floor(num / 1_000)}K+`;
  return num.toLocaleString();
}

function formatUpdated(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function HeroPanel() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [showBrands, setShowBrands] = useState(true); // Toggle between brands and locations
  const [brands, setBrands] = useState<{ total: number; top: BrandSummary[] } | null>(null);
  const [brandsError, setBrandsError] = useState(false);
  const { reportCounter, isLoading: countsLoading, error: countsError } = useReportCounter();

  // Shuffle words on mount
  useEffect(() => {
    setShuffledWords(shuffleArray(INTELLIGENCE_WORDS));
  }, []);

  // Rotate through words (fast - 2 seconds)
  useEffect(() => {
    if (shuffledWords.length === 0) return;
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % shuffledWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [shuffledWords]);

  // Slow carousel for stats (10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setShowBrands((prev) => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_RENDERER_API_URL || 'https://renderer.cleanapp.io'}/api/v4/brands/summary?classification=digital&lang=en`
        );
        const data: BrandSummary[] = await response.json();
        setBrands({
          total: data.filter((b) => b.total > 0).length,
          top: data
            .filter((b) => b.brand_name.toLowerCase() !== 'other')
            .sort((a, b) => b.total - a.total)
            .slice(0, 3),
        });
      } catch (error) {
        console.error('Failed to fetch brand summary:', error);
        setBrandsError(true);
      }
    };

    fetchBrands();
  }, []);

  const digitalReports = reportCounter.total_digital_reports;
  const physicalReports = reportCounter.total_physical_reports;
  const hasCounts = !countsLoading && !countsError && reportCounter.total_reports > 0;
  const updatedAt = formatUpdated((reportCounter as { last_updated?: string }).last_updated);

  const figures = [
    { label: 'Total reports', value: reportCounter.total_reports },
    { label: 'Digital reports', value: digitalReports },
    { label: 'Physical reports', value: physicalReports },
    { label: 'Brands', value: brands?.total ?? 0 },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gray-900 px-6 py-10 sm:px-10 text-white mb-8">
      {/* Subtle grid + glow, echoing the live map */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />
      <div className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-green-500/20 blur-3xl" aria-hidden="true" />

      <div className="relative text-center">
        {/* Word Carousel - The main focus */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-green-400 uppercase tracking-wider text-sm font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            Live
          </span>
          <span className="inline-block min-w-[9ch] text-3xl sm:text-4xl font-bold tracking-tight" aria-live="polite">
            {shuffledWords.length > 0 ? (
              <span key={currentWordIndex} className="dashboard-word-in inline-block">
                {shuffledWords[currentWordIndex]}
              </span>
            ) : (
              <span className="invisible">BRAND</span>
            )}
          </span>
          <span className="text-green-400 uppercase tracking-wider text-sm font-semibold">Intelligence</span>
        </div>

        {/* Stats carousel - slow (10 seconds) */}
        <p className="mt-5 min-h-[1.75rem] text-gray-300 text-lg">
          {hasCounts && (brands || brandsError) ? (
            <span key={showBrands ? 'brands' : 'locations'} className="dashboard-word-in inline-block">
              CleanApp is tracking{' '}
              {showBrands ? (
                <>
                  <span className="text-white font-semibold">{formatFloor(digitalReports)} reports</span>
                  {brands ? (
                    <>
                      {' '}across{' '}
                      <span className="text-white font-semibold">{brands.total.toLocaleString()}+ brands</span>
                    </>
                  ) : (
                    ' about digital products and services'
                  )}
                </>
              ) : (
                <>
                  <span className="text-white font-semibold">{formatFloor(physicalReports)} reports</span>
                  {' '}across{' '}
                  <span className="text-white font-semibold">physical locations worldwide</span>
                </>
              )}
            </span>
          ) : (
            <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded bg-gray-700 align-middle" />
          )}
        </p>

        {brands && brands.top.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-gray-400 text-sm">Most-reported brands:</span>
            {brands.top.map((brand) => (
              <Link
                key={brand.brand_name}
                href={`/digital/${encodeURIComponent(brand.brand_name)}`}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white hover:border-green-400/60 hover:bg-white/10 transition-colors"
              >
                {brand.brand_display_name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Exact figures from the live report counter */}
      <dl className="relative mt-10 grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
        {figures.map((figure) => (
          <div key={figure.label} className="bg-gray-900/90 px-4 py-4 sm:px-5 text-left">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{figure.label}</dt>
            <dd className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">
              {(figure.label === 'Brands' ? brands : hasCounts) ? (
                figure.value.toLocaleString()
              ) : (figure.label === 'Brands' ? brandsError : countsError) ? (
                <span className="text-gray-500">—</span>
              ) : (
                <span className="inline-block h-6 w-24 animate-pulse rounded bg-gray-700 align-middle" />
              )}
            </dd>
          </div>
        ))}
      </dl>
      {updatedAt && hasCounts && (
        <p className="relative mt-3 text-right text-xs text-gray-500">Counts refresh every 30 seconds · last updated {updatedAt}</p>
      )}
    </section>
  );
}
