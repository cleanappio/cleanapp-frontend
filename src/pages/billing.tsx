import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useAuthStore } from '@/lib/auth-store';
import { CreditCard, Download, Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { COUNTRIES } from '@/constants/countries';
import PageHeader from '@/components/PageHeader';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  },
  hidePostalCode: true
};

interface PaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentMethodForm({ onSuccess, onCancel }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user, addPaymentMethod } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [setAsDefault, setSetAsDefault] = useState(false);
  
  // Billing address fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName,
          email: email,
          address: {
            line1: addressLine1,
            line2: addressLine2 || undefined,
            city: city,
            state: state,
            postal_code: postalCode,
            country: country,
          },
        },
      });

      if (error) {
        toast.error(error.message || 'Payment method creation failed');
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        toast.error('Payment method creation failed');
        setIsProcessing(false);
        return;
      }

      // Add payment method via store
      await addPaymentMethod(paymentMethod.id, setAsDefault);
      
      toast.success('Payment method added successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Add payment method error:', error);
      toast.error(error.response?.data?.error || 'Failed to add payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Add New Payment Method</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label htmlFor="cardholder-name" className="block text-sm font-medium text-gray-700 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            id="cardholder-name"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card Information
          </label>
          <div className="border border-gray-300 rounded-md p-3 bg-white">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>

        {/* Billing Address Section */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Billing Address</h4>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="address-line1" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                id="address-line1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label htmlFor="address-line2" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                id="address-line2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postal-code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="set-as-default-billing"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="set-as-default-billing" className="ml-2 block text-sm text-gray-700">
            Set as default payment method
          </label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding...
            </>
          ) : (
            'Add Payment Method'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function BillingPageContent() {
  const router = useRouter();
  const { 
    isAuthenticated,
    isLoading,
    subscription, 
    paymentMethods, 
    billingHistory,
    billingLoading,
    fetchBillingData,
    cancelSubscription,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    downloadInvoice
  } = useAuthStore();
  
  const [cancelling, setCancelling] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Fetch billing data when component mounts
    // The store will handle caching, so this is safe to call
    if (isAuthenticated) {
      fetchBillingData();
    }
  }, [isAuthenticated, isLoading, fetchBillingData, router]);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    try {
      await cancelSubscription();
      toast.success('Subscription canceled successfully');
    } catch {
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
      await deletePaymentMethod(id);
      toast.success('Payment method removed');
    } catch {
      toast.error('Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (id: number) => {
    try {
      await setDefaultPaymentMethod(id);
      toast.success('Default payment method updated');
    } catch {
      toast.error('Failed to update default payment method');
    }
  };

  const handlePaymentMethodAdded = async () => {
    setShowAddPaymentForm(false);
  };

  const handleDownloadInvoice = async (billingHistoryId: number) => {
    try {
      await downloadInvoice(billingHistoryId);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Download invoice error:', error);
      toast.error('Failed to download invoice');
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
            <p className="text-gray-600 mb-4">You don&apos;t have an active subscription.</p>
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
            onClick={() => setShowAddPaymentForm(!showAddPaymentForm)}
            className="flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add New
            {showAddPaymentForm ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </button>
        </div>
        
        {showAddPaymentForm && (
          <PaymentMethodForm
            onSuccess={handlePaymentMethodAdded}
            onCancel={() => setShowAddPaymentForm(false)}
          />
        )}
        
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
                      <button 
                        onClick={() => handleDownloadInvoice(record.id)}
                        className="text-green-600 hover:text-green-700"
                        title="Download Invoice"
                      >
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
  </div>
  );
}

export default function BillingPage() {
  return (
    <Elements stripe={stripePromise}>
      <BillingPageContent />
    </Elements>
  );
}