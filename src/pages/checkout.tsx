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
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, CreditCard, Plus, ChevronDown, ChevronUp } from 'lucide-react';

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
  }
};

interface CheckoutFormProps {
  planType: string;
  billingCycle: 'monthly' | 'annual';
}

function CheckoutForm({ planType, billingCycle }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user, paymentMethods, fetchPaymentMethods, createSubscription, addPaymentMethod } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [setAsDefault, setSetAsDefault] = useState(false);

  useEffect(() => {
    fetchPaymentMethodsData();
  }, []);

  const fetchPaymentMethodsData = async () => {
    try {
      await fetchPaymentMethods();
      
      // If there are existing payment methods, select the default one or the first one
      if (paymentMethods && paymentMethods.length > 0) {
        const defaultMethod = paymentMethods.find(m => m.is_default);
        setSelectedPaymentMethod(defaultMethod ? defaultMethod.stripe_payment_method_id : paymentMethods[0].stripe_payment_method_id);
      } else {
        // No existing payment methods, show the form
        setShowNewPaymentForm(true);
        setSetAsDefault(true); // First payment method should be default
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      // If fetching fails, default to showing the new payment form
      setShowNewPaymentForm(true);
      setSetAsDefault(true); // First payment method should be default
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Watch for changes to paymentMethods from the store
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedPaymentMethod) {
      const defaultMethod = paymentMethods.find(m => m.is_default);
      setSelectedPaymentMethod(defaultMethod ? defaultMethod.stripe_payment_method_id : paymentMethods[0].stripe_payment_method_id);
    } else if (paymentMethods.length === 0) {
      setShowNewPaymentForm(true);
      setSetAsDefault(true);
    }
  }, [paymentMethods]);

  const getPlanDetails = () => {
    const plans = {
      base: { name: 'Lite', price: 99.99 },
      advanced: { name: 'Enterprise', price: 499.99 },
      exclusive: { name: 'Civic', price: 0 } // Custom pricing
    };
    
    const plan = plans[planType as keyof typeof plans];
    if (!plan) return null;
    
    const monthlyPrice = plan.price;
    const price = billingCycle === 'annual' ? monthlyPrice * 12 * 0.8 : monthlyPrice;
    
    return {
      ...plan,
      price,
      displayPrice: billingCycle === 'annual' ? `$${price}/year` : `$${monthlyPrice}/month`
    };
  };

  const planDetails = getPlanDetails();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !planDetails) {
      return;
    }

    setIsProcessing(true);

    try {
      let paymentMethodId: string;

      if (showNewPaymentForm && selectedPaymentMethod === 'new') {
        // Create new payment method
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          toast.error('Card element not found');
          setIsProcessing(false);
          return;
        }

        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: cardholderName,
            email: email,
          },
        });

        if (error) {
          toast.error(error.message || 'Payment failed');
          setIsProcessing(false);
          return;
        }

        if (!paymentMethod) {
          toast.error('Payment method creation failed');
          setIsProcessing(false);
          return;
        }

        paymentMethodId = paymentMethod.id;

        // If user wants to set as default, add the payment method first
        if (setAsDefault) {
          try {
            await addPaymentMethod(paymentMethodId, true);
          } catch {
            console.log('Payment method will be added during subscription creation');
            // Continue anyway as the subscription endpoint might handle this
          }
        }
      } else {
        // Use existing payment method
        paymentMethodId = selectedPaymentMethod;
      }

      // Create subscription via store
      await createSubscription(planType, billingCycle, paymentMethodId);

      toast.success('Subscription created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to create subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!planDetails) {
    return <div>Invalid plan selected</div>;
  }

  if (loadingPaymentMethods) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Subscription Summary</h3>
        <div className="border-b pb-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Plan</span>
            <span className="font-medium">{planDetails.name}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Billing Cycle</span>
            <span className="font-medium capitalize">{billingCycle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total</span>
            <span className="font-bold text-lg">{planDetails.displayPrice}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment Information
        </h3>
        
        {/* Existing Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</p>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPaymentMethod === method.stripe_payment_method_id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.stripe_payment_method_id}
                    checked={selectedPaymentMethod === method.stripe_payment_method_id}
                    onChange={(e) => {
                      setSelectedPaymentMethod(e.target.value);
                      setShowNewPaymentForm(false);
                      setSetAsDefault(false);
                    }}
                    className="mr-3 text-green-600 focus:ring-green-500"
                  />
                  <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last_four}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {method.exp_month}/{method.exp_year}
                    </p>
                  </div>
                  {method.is_default && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Default</span>
                  )}
                </label>
              ))}
              
              {/* Add New Payment Method Option */}
              <button
                type="button"
                onClick={() => {
                  setShowNewPaymentForm(!showNewPaymentForm);
                  setSelectedPaymentMethod(showNewPaymentForm ? '' : 'new');
                  if (!showNewPaymentForm) {
                    setSetAsDefault(false);
                  }
                }}
                className={`w-full flex items-center justify-center p-3 border rounded-lg transition-colors ${
                  showNewPaymentForm 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900'
                }`}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Payment Method
                {showNewPaymentForm ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* New Payment Method Form */}
        {showNewPaymentForm && (
          <div className={`space-y-4 ${paymentMethods.length > 0 ? 'mt-4 pt-4 border-t' : ''}`}>
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
                required={showNewPaymentForm}
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
                required={showNewPaymentForm}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Information
              </label>
              <div className="border border-gray-300 rounded-md p-3">
                <CardElement options={CARD_ELEMENT_OPTIONS} />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="set-as-default"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="set-as-default" className="ml-2 block text-sm text-gray-700">
                Set as default payment method
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing || (!selectedPaymentMethod && !showNewPaymentForm)}
          className="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Subscribe {planDetails.displayPrice}
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your payment information is encrypted and secure. You can cancel your subscription at any time.
        </p>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { plan, billing } = router.query;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!plan || !billing) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-gray-600 mb-4">No plan selected</p>
          <button
            onClick={() => router.push('/pricing')}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/pricing')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to pricing
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Complete Your Subscription
        </h1>

        <Elements stripe={stripePromise}>
          <CheckoutForm 
            planType={plan as string} 
            billingCycle={billing as 'monthly' | 'annual'} 
          />
        </Elements>
      </div>
    </div>
  );
}