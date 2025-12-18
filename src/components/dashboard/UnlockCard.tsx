import { useRouter } from 'next/router';
import { BarChart2, Download, Bell, Users, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

export default function UnlockCard() {
  const router = useRouter();
  const { t } = useTranslations();

  const capabilities = [
    { icon: BarChart2, label: 'Compare weeks and trends' },
    { icon: Download, label: 'Export data and reports' },
    { icon: Bell, label: 'Set up custom alerts' },
    { icon: Users, label: 'Add team collaborators' },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h2 className="text-xl font-semibold text-gray-900">Unlock Deeper Insights</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Get more from CleanApp with advanced features designed for professionals.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {capabilities.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <Icon className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/pricing')}
        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition-colors group"
      >
        View plans
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
