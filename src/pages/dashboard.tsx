import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuthStore } from '@/lib/auth-store';
import PageHeader from '@/components/PageHeader';
import { useTranslations } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';

// New dashboard components
import HeroPanel from '@/components/dashboard/HeroPanel';
import ActionCard from '@/components/dashboard/ActionCard';
import PotentialStats from '@/components/dashboard/PotentialStats';
import MapTeaser from '@/components/dashboard/MapTeaser';
import NextSteps from '@/components/dashboard/NextSteps';
import UnlockCard from '@/components/dashboard/UnlockCard';

// Matches the plan names on /pricing and /checkout.
const PLAN_NAMES: Record<string, string> = {
  base: 'CleanApp Pro',
  advanced: 'CleanApp Enterprise',
  exclusive: 'CleanApp Enterprise',
};

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
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const planName = subscription ? PLAN_NAMES[subscription.plan_type] || subscription.plan_type : 'Free';

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>CleanApp - Dashboard</title>
        <meta name="robots" content="noindex, nofollow" key="robots" />
      </Head>
      <PageHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Dashboard</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
              <span className={`h-2 w-2 rounded-full ${subscription ? 'bg-green-500' : 'bg-gray-400'}`} />
              {planName}
            </span>
            <button
              onClick={() => router.push(subscription ? '/billing' : '/pricing')}
              className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              {subscription ? 'Manage subscription' : 'View plans'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1️⃣ Hero Panel - Live Intelligence */}
        <HeroPanel />

        {/* 2️⃣ Primary Action Card */}
        <ActionCard />

        {/* 3️⃣ Potential Stats (Inventory, not usage) */}
        <PotentialStats />

        {/* Two Column Layout for Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 items-stretch">
          {/* 6️⃣ Suggested Next Steps */}
          <NextSteps />

          {/* 5️⃣ Unlock Card (capability framing) */}
          {!subscription && <UnlockCard />}

          {/* Show subscription details if subscribed */}
          {subscription && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Subscription</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-semibold text-gray-900">{planName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
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
                  className="w-full mt-4 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black transition-colors"
                >
                  Manage subscription →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4️⃣ Map Teaser */}
        <MapTeaser />
      </main>
    </div>
  );
}
