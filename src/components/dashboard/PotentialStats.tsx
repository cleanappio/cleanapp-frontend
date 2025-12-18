import { FileText, Bell, Cpu, Map } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${color === 'text-green-600' ? 'from-green-100 to-green-50' : color === 'text-blue-600' ? 'from-blue-100 to-blue-50' : color === 'text-purple-600' ? 'from-purple-100 to-purple-50' : 'from-orange-100 to-orange-50'}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

export default function PotentialStats() {
  const { t } = useTranslations();

  // These are platform inventory numbers, not user-specific
  const stats = [
    {
      icon: FileText,
      label: 'Reports available for you',
      value: '150,000+',
      color: 'text-green-600',
    },
    {
      icon: Bell,
      label: 'Alerts you could activate',
      value: '50+',
      color: 'text-blue-600',
    },
    {
      icon: Cpu,
      label: 'AI analyses ready to run',
      value: '500+',
      color: 'text-purple-600',
    },
    {
      icon: Map,
      label: 'Locations to monitor',
      value: '1,000+',
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
