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
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-indigo-500" />
        <h2 className="text-xl font-semibold text-gray-900">For Teams & Organizations</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Collaborate across your organization with shared dashboards and team features.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {capabilities.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <Icon className="w-5 h-5 text-indigo-500" />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/pricing')}
        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors group"
      >
        View plans
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
