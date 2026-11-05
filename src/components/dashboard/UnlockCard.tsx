import { useRouter } from 'next/router';
import { Download, Users, Building2, Share2, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

export default function UnlockCard() {
  const router = useRouter();
  const { t } = useTranslations();

  const capabilities = [
    { icon: Users, label: 'Invite team members' },
    { icon: Share2, label: 'Share dashboards' },
    { icon: Download, label: 'Export reports & data' },
    { icon: Building2, label: 'Multi-brand coverage' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-green-700" />
        <h2 className="text-lg font-semibold text-gray-900">For Teams & Organizations</h2>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Collaborate across your organization with shared dashboards and team features.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {capabilities.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <Icon className="w-5 h-5 text-green-700" />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/pricing')}
        className="mt-auto inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold text-sm transition-colors group"
      >
        View plans
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
