import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface BrandSummary {
  brand_name: string;
  brand_display_name: string;
  total: number;
}

interface LiveStats {
  digitalReports: number;
  totalBrands: number;
  physicalReports: number;
  locations: number;
  topBrands: BrandSummary[];
  isLoading: boolean;
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

export default function HeroPanel() {
  const { t } = useTranslations();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [showBrands, setShowBrands] = useState(true); // Toggle between brands and locations
  const [stats, setStats] = useState<LiveStats>({
    digitalReports: 0,
    totalBrands: 0,
    physicalReports: 78000, // Fallback for physical reports
    locations: 12283, // Fallback for locations (78000 / 6.35)
    topBrands: [],
    isLoading: true,
  });

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
    const fetchLiveStats = async () => {
      try {
        // Fetch digital reports (brands)
        const digitalResponse = await fetch(
          `${process.env.NEXT_PUBLIC_RENDERER_API_URL || 'https://renderer.cleanapp.io'}/api/v4/brands/summary?classification=digital&lang=en`
        );
        const digitalData: BrandSummary[] = await digitalResponse.json();

        const digitalReports = digitalData.reduce((sum, b) => sum + b.total, 0);
        const totalBrands = digitalData.filter(b => b.total > 0).length;

        const topBrands = digitalData
          .filter(b => b.brand_name.toLowerCase() !== 'other')
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Use fallback values for physical reports since API doesn't support it
        const physicalReports = 78000;
        const locations = Math.floor(physicalReports / 6.35);

        setStats({
          digitalReports,
          totalBrands,
          physicalReports,
          locations,
          topBrands,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to fetch live stats:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchLiveStats();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}K+`;
    return num.toString();
  };

  if (stats.isLoading || shuffledWords.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 mb-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 w-96 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 mb-8 relative overflow-hidden">
      {/* Animated background dots */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-8 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <div className="absolute top-12 right-16 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-8 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-16 right-1/3 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-8 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>

      <div className="relative z-10 text-center">
        {/* Word Carousel - The main focus */}
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="w-5 h-5 text-green-400 mr-2" />
          <span className="text-green-400 uppercase tracking-wider text-sm font-medium">Live</span>
          <span
            className="mx-2 text-white font-bold text-xl md:text-2xl transition-all duration-300"
            key={currentWordIndex}
          >
            {shuffledWords[currentWordIndex]}
          </span>
          <span className="text-green-400 uppercase tracking-wider text-sm font-medium">Intelligence</span>
        </div>

        {/* Stats carousel - slow (10 seconds) */}
        <p className="text-gray-300 text-lg mb-6 transition-opacity duration-500">
          CleanApp is tracking{' '}
          {showBrands ? (
            <>
              <span className="text-green-400 font-bold">{formatNumber(stats.digitalReports)} reports</span>
              {' '}across{' '}
              <span className="text-green-400 font-bold">{stats.totalBrands.toLocaleString()}+ brands</span>
            </>
          ) : (
            <>
              <span className="text-green-400 font-bold">{formatNumber(stats.physicalReports)} reports</span>
              {' '}across{' '}
              <span className="text-green-400 font-bold">{stats.locations.toLocaleString()}+ locations</span>
            </>
          )}
        </p>

        {stats.topBrands.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-gray-400 text-sm">Top brands this week:</span>
            {stats.topBrands.slice(0, 3).map((brand, i) => (
              <span key={brand.brand_name} className="inline-flex items-center">
                <span className="bg-gray-700/60 text-white px-3 py-1 rounded-full text-sm">
                  {brand.brand_display_name}
                </span>
                {i < 2 && <span className="text-gray-600 mx-1">,</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
