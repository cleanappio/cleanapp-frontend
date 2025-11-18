import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { MapPin, BarChart3, CreditCard, TrendingUp, Activity, Users, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useTranslations } from '@/lib/i18n';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, subscription, billingLoading } = useAuthStore();
  const { t } = useTranslations();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  const formatPlanName = (planType: string) => {
    const names: Record<string, string> = {
      base: t('lite'),
      advanced: t('enterprise'),
      exclusive: t('civic')
    };
    return names[planType] || planType;
  };

  const getLocationLimit = () => {
    if (!subscription) return 0;
    switch (subscription.plan_type) {
      case 'base': return 1;
      case 'advanced': return 5;
      case 'exclusive': return t('unlimited');
      default: return 0;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (billingLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
        <p className="text-gray-600 mt-2">{t('welcomeBackUser', { name: user?.name || '' })}</p>
      </div>

      {/* Subscription Alert */}
      {!subscription && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {t('freeTierAlert')}
                <button 
                  onClick={() => router.push('/pricing')}
                  className="font-medium underline text-yellow-700 hover:text-yellow-600 ml-2"
                >
                  {t('upgradeToUnlock')}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('activeLocations')}</p>
              <p className="text-2xl font-bold text-gray-900">
                0 / {getLocationLimit()}
              </p>
            </div>
            <MapPin className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('reportsThisMonth')}</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('aiCreditsUsed')}</p>
              <p className="text-2xl font-bold text-gray-900">
                0 / {subscription ? '1000' : '10'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('activeAlerts')}</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('yourSubscription')}</h2>
          {subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('plan')}</span>
                <span className="font-semibold text-gray-900">{formatPlanName(subscription.plan_type)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('status')}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {subscription.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('billing')}</span>
                <span className="font-semibold text-gray-900 capitalize">{subscription.billing_cycle}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">{t('nextBilling')}</span>
                <span className="font-semibold text-gray-900">
                  {new Date(subscription.next_billing_date).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => router.push('/billing')}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  {t('manageSubscription')} &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">{t('freeTierLimited')}</p>
              <button
                onClick={() => router.push('/pricing')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 w-full"
              >
                {t('upgradeNow')}
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('recentActivity')}</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{t('accountCreated')}</p>
                <p className="text-sm text-gray-500">{t('welcomeToCleanApp')}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : t('recently')}
                </p>
              </div>
            </div>
            
            {subscription && (
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{t('subscriptionStarted')}</p>
                  <p className="text-sm text-gray-500">{formatPlanName(subscription.plan_type)} {t('planActivated')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(subscription.start_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Preview */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t('cleanAppMap')}</h2>
          <button className="text-green-600 hover:text-green-700 font-medium">
            {t('openFullMap')} &rarr;
          </button>
        </div>
        <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('mapIntegrationComingSoon')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {subscription ? t('setUpFirstMonitoringLocation') : t('upgradeToAccessRealtimeMonitoring')}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}