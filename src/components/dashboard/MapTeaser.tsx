import { useRouter } from 'next/router';
import { useTranslations } from '@/lib/i18n';
import { ArrowRight, Map as MapIcon } from 'lucide-react';

export default function MapTeaser() {
  const router = useRouter();
  const { t } = useTranslations();

  return (
    <div className="relative bg-gray-900 rounded-2xl overflow-hidden mb-8 group border border-gray-200">
      {/* Background gradient to simulate map */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
        {/* Simulated report dots */}
        <div className="absolute inset-0 opacity-30">
          {/* Clusters of dots to simulate report density */}
          <div className="absolute top-[20%] left-[15%] w-3 h-3 bg-green-400 rounded-full blur-sm"></div>
          <div className="absolute top-[22%] left-[17%] w-2 h-2 bg-green-400 rounded-full blur-sm"></div>
          <div className="absolute top-[25%] left-[14%] w-2 h-2 bg-green-400 rounded-full blur-sm"></div>

          <div className="absolute top-[40%] left-[45%] w-4 h-4 bg-red-400 rounded-full blur-sm"></div>
          <div className="absolute top-[42%] left-[47%] w-2 h-2 bg-red-400 rounded-full blur-sm"></div>
          <div className="absolute top-[38%] left-[48%] w-2 h-2 bg-orange-400 rounded-full blur-sm"></div>

          <div className="absolute top-[60%] right-[20%] w-3 h-3 bg-yellow-400 rounded-full blur-sm"></div>
          <div className="absolute top-[62%] right-[22%] w-2 h-2 bg-yellow-400 rounded-full blur-sm"></div>

          <div className="absolute bottom-[30%] left-[30%] w-3 h-3 bg-green-400 rounded-full blur-sm"></div>
          <div className="absolute bottom-[28%] left-[32%] w-2 h-2 bg-green-400 rounded-full blur-sm"></div>

          <div className="absolute top-[30%] right-[35%] w-4 h-4 bg-blue-400 rounded-full blur-sm"></div>
          <div className="absolute top-[32%] right-[33%] w-2 h-2 bg-blue-400 rounded-full blur-sm"></div>
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-gray-900/30"></div>

      {/* Content */}
      <div className="relative z-10 min-h-[22rem] py-10 flex flex-col items-center justify-center text-center px-6">
        <div className="bg-gray-900/70 border border-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md">
          <div className="w-12 h-12 bg-green-500/15 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MapIcon className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Live Map Preview</h3>
          <p className="text-gray-300 mb-6">
            Real-time reports are being tracked worldwide. Explore the map to see what&apos;s happening.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 px-5 py-3 rounded-lg text-sm font-semibold transition-colors group"
          >
            Explore the map
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
