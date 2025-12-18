import { useRouter } from 'next/router';
import { Search, MapPin, TrendingUp, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface StepButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

function StepButton({ icon: Icon, label, href }: StepButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center justify-between w-full p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
          <Icon className="w-5 h-5 text-gray-600 group-hover:text-green-600" />
        </div>
        <span className="font-medium text-gray-800 group-hover:text-green-700">{label}</span>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

export default function NextSteps() {
  const { t } = useTranslations();

  const steps = [
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
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommended Next Steps</h2>
      <div className="space-y-3">
        {steps.map((step) => (
          <StepButton key={step.label} {...step} />
        ))}
      </div>
    </div>
  );
}
