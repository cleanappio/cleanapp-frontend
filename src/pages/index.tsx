import { useRouter } from 'next/router';
import Image from 'next/image';
import { MapPin, Sparkles, BarChart3, Shield } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <Image 
                src="/cleanapp-logo.png" 
                alt="CleanApp" 
                width={300} 
                height={90}
                priority
              />
            </div>
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Keep Your Property Clean</span>
              <span className="block text-green-600">With AI-Powered Monitoring</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              CleanApp uses advanced AI to monitor litter in real-time, helping cities and organizations maintain cleaner environments.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <button
                  onClick={() => router.push('/signup')}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 md:py-4 md:text-lg md:px-10"
                >
                  Get started for free
                </button>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <button
                  onClick={() => router.push('/pricing')}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-green-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  View pricing
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-green-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to monitor litter
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                  <MapPin className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Real-time Mapping</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Track litter incidents as they happen with our interactive CleanAppMap.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">AI Analytics</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Advanced AI identifies material composition, brands, and urgency ratings.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Predictive Insights</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Anticipate hotspots and optimize cleanup resources with predictive analytics.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                  <Shield className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Smart City Integration</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Seamlessly integrate with existing smart city platforms like Open311.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
