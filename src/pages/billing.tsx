import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, Subscription, PaymentMethod, BillingHistory } from '@/lib/api-client';
import { CreditCard, Calendar, Download, Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchBillingData();
  }, [isAuthenticated]);

  const fetchBillingData = async () => {
    try {
      const [sub, methods, history] = await Promise.all([
        apiClient.getCurrentSubscription().catch(() => null),
        apiClient.getPaymentMethods().catch(() => []),
        apiClient.getBillingHistory({ limit: 10 }).catch(() => ({ data: [], pagination: { page: 1, limit: 10 } }))
      ]);

      setSubscription(sub);
      setPaymentMethods(methods || []);
      setBillingHistory(history?.data || []);
    } catch (error) {
      console.error('Billing data error:', error);
      toast.error('Failed to load billing information');
      // Ensure we have default values even on error
      setPaymentMethods([]);
      setBillingHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    try {
      await apiClient.cancelSubscription();
      toast.success('Subscription canceled successfully');
      setSubscription(null);
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      await apiClient.deletePaymentMethod(id);
      setPaymentMethods(methods => methods.filter(m => m.id !== id));
      toast.success('Payment method removed');
    } catch (error) {
      toast.error('Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (id: number) => {
    try {
      await apiClient.setDefaultPaymentMethod(id);
      await fetchBillingData();
      toast.success('Default payment method updated');
    } catch (error) {
      toast.error('Failed to update default payment method');
    }
  };

  const formatPlanName = (planType: string) => {
    const names: Record<string, string> = {
      base: 'Lite',
      advanced: 'Enterprise',
      exclusive: 'Civic'
    };
    return names[planType] || planType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

      {/* Current Subscription */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
        {subscription ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="font-semibold">{formatPlanName(subscription.plan_type)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Billing Cycle</p>
                <p className="font-semibold capitalize">{subscription.billing_cycle}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  subscription.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {subscription.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Billing Date</p>
                <p className="font-semibold">{formatDate(subscription.next_billing_date)}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/pricing')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Change Plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
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

      {/* Payment Methods */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Payment Methods</h2>
          <button
            onClick={() => router.push('/add-payment-method')}
            className="flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add New
          </button>
        </div>
        
        {paymentMethods && paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="w-8 h-8 text-gray-400 mr-4" />
                  <div>
                    <p className="font-medium">
                      {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last_four}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expires {method.exp_month}/{method.exp_year}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!method.is_default && (
                    <button
                      onClick={() => handleSetDefaultPaymentMethod(method.id)}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      Set as default
                    </button>
                  )}
                  {method.is_default && (
                    <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Default
                    </span>
                  )}
                  <button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No payment methods on file.</p>
        )}
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Billing History</h2>
        {billingHistory && billingHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingHistory.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(record.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : record.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-green-600 hover:text-green-700">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No billing history available.</p>
        )}
      </div>
    </div>
  );
}
