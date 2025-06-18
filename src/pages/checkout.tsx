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
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, CreditCard } from 'lucide-react';

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
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState(user?.email || '');

  const getPlanDetails = () => {
    const plans = {
      base: { name: 'Lite', price: 100 },
      advanced: { name: 'Enterprise', price: 500 },
      exclusive: { name: 'Civic', price: 0 } // Custom pricing
    };
    
    const plan = plans[planType as keyof typeof plans];
    if (!plan) return null;
    
    const monthlyPrice = plan.price;
    const price = billingCycle === 'annual' ? monthlyPrice * 12 * 0.8 : monthlyPrice;
    
    return {
      ...plan,
      price,
      displayPrice: billingCycle === 'annual' ? `${price}/year` : `${monthlyPrice}/month`
    };
  };

  const planDetails = getPlanDetails();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !planDetails) {
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

      // Create subscription via API
      await apiClient.createSubscription(
        planType,
        billingCycle,
        paymentMethod.id
      );

      toast.success('Subscription created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.error || 'Failed to create subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!planDetails) {
    return <div>Invalid plan selected</div>;
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
            <div className="border border-gray-300 rounded-md p-3">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || isProcessing}
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