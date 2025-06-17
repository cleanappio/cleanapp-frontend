import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, Subscription } from '@/lib/api-client';
import { MapPin, BarChart3, CreditCard, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchSubscription();
  }, [isAuthenticated]);

  const fetchSubscription = async () => {
    try {
      const sub = await apiClient.getCurrentSubscription();
      setSubscription(sub);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPlanName = (planType: string) => {
    return planType.charAt(0).toUpperCase() + planType.slice(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
      </div>

      {/* Subscription Status */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Your Subscription</h2>
        {subscription ? (
          <div className="space-y-2">
            <p className="text-gray-600">
              Plan: <span className="font-semibold text-gray-900">{formatPlanName(subscription.plan_type)}</span>
            </p>
            <p className="text-gray-600">
              Status: <span className="font-semibold text-green-600">{subscription.status}</span>
            </p>
            <p className="text-gray-600">
              Billing: <span className="font-semibold text-gray-900">{subscription.billing_cycle}</span>
            </p>
            <p className="text-gray-600">
              Next billing date: <span className="font-semibold text-gray-900">
                {new Date(subscription.next_billing_date).toLocaleDateString()}
              </span>
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.push('/billing')}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Manage subscription →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">You don't have an active subscription.</p>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              View Plans
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Locations</p>
              <p className="text-2xl font-bold text-gray-900">
                {subscription ? (subscription.plan_type === 'base' ? '1' : '5') : '0'}
              </p>
            </div>
            <MapPin className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Reports This Month</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AI Credits Used</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Payment Methods</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Map Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">CleanApp Map</h2>
        <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Map integration coming soon</p>
        </div>
      </div>
    </div>
  );
}
