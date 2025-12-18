import { useRouter } from 'next/router';
import { MapPin, Building2, Globe } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  example: string;
  onClick: () => void;
}

function ActionButton({ icon: Icon, label, description, example, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center p-6 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 border-white/30 hover:border-white/50"
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

  return (
    <div className="bg-gradient-to-r from-green-600 via-green-600 to-emerald-600 rounded-2xl p-8 mb-8 shadow-xl">
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
        <ActionButton
          icon={Building2}
          label="Track a brand"
          description="Follow issues for any product"
          example="e.g. Airbnb, TikTok, Uber"
          onClick={() => router.push('/?tab=digital')}
        />
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
