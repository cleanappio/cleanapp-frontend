"use client";

import { useRouter } from 'next/router';
import { Search, MapPin, TrendingUp, ArrowRight, Bell } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { useUserActivityStore } from '@/lib/user-activity-store';
import { useEffect, useState } from 'react';

interface StepButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isPersonalized?: boolean;
}

function StepButton({ icon: Icon, label, href, isPersonalized }: StepButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className={`flex items-center justify-between w-full p-4 rounded-lg border transition-all group ${isPersonalized
          ? 'border-green-300 bg-green-50/50 hover:border-green-500 hover:bg-green-50'
          : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPersonalized
            ? 'bg-green-100 group-hover:bg-green-200'
            : 'bg-gray-100 group-hover:bg-green-100'
          }`}>
          <Icon className={`w-5 h-5 ${isPersonalized ? 'text-green-600' : 'text-gray-600 group-hover:text-green-600'}`} />
        </div>
        <span className={`font-medium text-left ${isPersonalized ? 'text-green-700' : 'text-gray-800 group-hover:text-green-700'}`}>
          {label}
        </span>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

export default function NextSteps() {
  const { t } = useTranslations();
  const [mounted, setMounted] = useState(false);
  const getRecentBrands = useUserActivityStore((state) => state.getRecentBrands);
  const getRecentLocations = useUserActivityStore((state) => state.getRecentLocations);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const recentBrands = mounted ? getRecentBrands(7) : [];
  const recentLocations = mounted ? getRecentLocations(7) : [];

  // Build personalized step if we have activity
  const personalizedStep = recentBrands.length > 0
    ? {
      icon: Bell,
      label: `Track ${recentBrands[0].name} continuously`,
      href: `/digital/${encodeURIComponent(recentBrands[0].name.toLowerCase())}`,
      isPersonalized: true,
    }
    : recentLocations.length > 0
      ? {
        icon: Bell,
        label: `Enable alerts for ${recentLocations[0].name}`,
        href: '/',
        isPersonalized: true,
      }
      : null;

  // Build steps list
  const steps = [
    // Personalized step first (if available)
    ...(personalizedStep ? [personalizedStep] : []),
    // Generic steps
    {
      icon: Search,
      label: 'Search for a brand you care about',
      href: '/?search=true',
    },
    {
      icon: MapPin,
      label: 'Add your first monitoring location',
      href: '/',
    },
    {
      icon: TrendingUp,
      label: "View today's most reported issues",
      href: '/digital/reddit',
    },
  ].slice(0, 3); // Only show 3 steps

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Continue where you left off</h2>
      <div className="space-y-3">
        {steps.map((step) => (
          <StepButton key={step.label} {...step} />
        ))}
      </div>
    </div>
  );
}
