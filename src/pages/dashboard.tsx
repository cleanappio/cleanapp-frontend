import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuthStore } from '@/lib/auth-store';
import PageHeader from '@/components/PageHeader';
import { useTranslations } from '@/lib/i18n';

// New dashboard components
import HeroPanel from '@/components/dashboard/HeroPanel';
import ActionCard from '@/components/dashboard/ActionCard';
import PotentialStats from '@/components/dashboard/PotentialStats';
import MapTeaser from '@/components/dashboard/MapTeaser';
import NextSteps from '@/components/dashboard/NextSteps';
import UnlockCard from '@/components/dashboard/UnlockCard';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, subscription, billingLoading } = useAuthStore();
  const { t } = useTranslations();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || billingLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>CleanApp - Dashboard</title>
      </Head>
      <PageHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
        </div>

        {/* 1️⃣ Hero Panel - Live Intelligence */}
        <HeroPanel />

        {/* 2️⃣ Primary Action Card */}
        <ActionCard />

        {/* 3️⃣ Potential Stats (Inventory, not usage) */}
        <PotentialStats />

        {/* Two Column Layout for Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 6️⃣ Suggested Next Steps */}
          <NextSteps />

          {/* 5️⃣ Unlock Card (capability framing) */}
          {!subscription && <UnlockCard />}

          {/* Show subscription details if subscribed */}
          {subscription && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Subscription</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-semibold text-gray-900 capitalize">{subscription.plan_type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {subscription.status}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Next billing</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(subscription.next_billing_date).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => router.push('/billing')}
                  className="w-full mt-4 text-green-600 hover:text-green-700 font-medium text-center py-2 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Manage subscription →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4️⃣ Map Teaser */}
        <MapTeaser />
      </div>
    </div>
  );
}