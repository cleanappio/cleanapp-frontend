import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { ChevronRight, Check, MapPin, BarChart3, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

interface BillingCycle {
  type: string;
  price: number;
  currency: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  billingCycles?: BillingCycle[];
  features: string[];
  apiPlanType?: 'base' | 'advanced' | 'exclusive';
  popular?: boolean;
  customPricing?: boolean;
  imageSrc?: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated, subscription, prices, fetchPrices } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const fetchPricesData = async () => {
    await fetchPrices();
  }

  useEffect(() => {
    fetchPricesData();
  }, []);

  const getPricesForPlan = (planId: string) => {
    const pr = prices.filter(price => price.product === planId) || {};
    return pr.map(price => ({
      type: price.period,
      price: price.amount / 100, // Convert cents to dollars
      currency: price.currency.toUpperCase()
    }));
  };

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'forever free',
      billingCycles: [
        { type: 'monthly', price: 0, currency: 'USD' },
        { type: 'annual', price: 0, currency: 'USD' }
      ],
      features: ['web access to CleanAppMap'],
      imageSrc: '/free.png'
    },
    {
      id: 'lite',
      name: 'lite',
      apiPlanType: 'base',
      billingCycles: getPricesForPlan('base'),
      features: [
        'real time data subscription',
        'AI analytics (material composition, brand analysis, urgency ratings) for 1 location (geoquadrant) -or- 1 brand (eg, Redbull, Starbucks)',
        'access to CleanApp responder app'
      ],
      imageSrc: '/lite.png'
    },
    {
      id: 'enterprise',
      name: 'enterprise',
      apiPlanType: 'advanced',
      billingCycles: getPricesForPlan('advanced'),
      popular: true,
      features: [
        'lite tier, plus:',
        'priority access to AI hotspot mapping & predictive analytics for up to 5 locations -or- 5 brands',
        'integration support for firmware',
        'custom web dashboard'
      ],
      imageSrc: '/enterprise.png'
    },
  ];

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    if (!subscription) {
      // If no subscription, user is on free plan
      return plan.id === 'free';
    }
    // Match the plan by apiPlanType
    return plan.apiPlanType === subscription.plan_type && billingCycle === subscription.billing_cycle;
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      router.push('/signup');
      return;
    }

    // If it's the current plan, do nothing
    if (isCurrentPlan(plan)) {
      return;
    }

    if (plan.id === 'free' && subscription) {
      // Downgrading to free means cancelling subscription
      router.push('/billing');
      toast('To downgrade to free, please cancel your subscription from the billing page');
      return;
    }

    if (plan.customPricing) {
      toast.success('Please contact our sales team for custom pricing');
      return;
    }

    // Navigate to checkout with plan details
    const display = getPriceDisplay(plan);
    const displayPrice = billingCycle === 'annual' ? display.annual : display.monthly;
    router.push({
      pathname: '/checkout',
      query: {
        plan: plan.apiPlanType,
        billing: billingCycle,
        displayPrice: displayPrice,
      }
    });
  };

  const getPriceDisplay = (plan: SubscriptionPlan) => {
    const price = plan.billingCycles?.find(bc => bc.type === billingCycle);
    if (!price) {
      return {
        monthly: 'Contact Sales',
        annual: null,
      };
    }
    if (billingCycle === 'annual' && price) {
      return {
        monthly: `${price.price / 12} ${price.currency}/mo`,
        annual: `${price.price} ${price.currency}/yr`
      };
    }
    return {
      monthly: `${price.price} ${price.currency}/mo`,
      annual: null
    };
  };

  const getButtonText = (plan: SubscriptionPlan) => {
    if (isCurrentPlan(plan)) {
      return 'Current';
    }
    
    if (!subscription && plan.id === 'free') {
      return 'Current';
    }

    if (plan.id === 'free') {
      return 'Downgrade';
    }

    if (plan.customPricing) {
      return 'Contact Sales';
    }

    // If user has any subscription, show "Change now" for other plans
    if (subscription) {
      return 'Change now';
    }

    // If no subscription (on free plan), show different text
    return 'Subscribe Now';
  };

  const getButtonStyle = (plan: SubscriptionPlan) => {
    if (isCurrentPlan(plan)) {
      return 'bg-gray-300 text-gray-600 cursor-not-allowed';
    }

    if (plan.id === 'free') {
      return 'bg-white text-green-700 hover:bg-gray-50 border border-green-600';
    }

    if (plan.customPricing) {
      return 'bg-gray-800 text-white hover:bg-gray-900';
    }

    return 'bg-green-600 text-white hover:bg-green-700';
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your CleanApp Plan
          </h1>
          <p className="text-xl text-gray-600">
            Select the perfect plan for your litter monitoring needs
          </p>
        </div>

        {/* Billing Toggle - Only show if there are paid plans */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-md transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual <span className="text-sm">(Discount)</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg ${
                isCurrentPlan(plan) ? 'ring-2 ring-green-600 shadow-lg' : ''
              }`}
              style={{ backgroundColor: '#EBF1E8' }}
            >
              {/* Current Plan Badge */}
              {isCurrentPlan(plan) && (
                <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 text-sm font-semibold rounded-full z-10">
                  Current Plan
                </div>
              )}
              
              {/* Plan Image */}
              <div className="h-40 relative overflow-hidden">
                <Image
                  src={plan.imageSrc || '/api/placeholder/400/300'}
                  alt={`${plan.name} plan`}
                  width={400}
                  height={160}
                  className="w-full h-full object-cover"
                  priority={plan.popular}
                />
                {plan.popular && !isCurrentPlan(plan) && (
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 text-sm font-semibold rounded-full">
                    Popular
                  </div>
                )}
              </div>

              {/* Plan Details */}
              <div className="p-6">
                {/* Plan Name and Price */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-green-700 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {getPriceDisplay(plan).monthly}
                  </p>
                  {billingCycle === 'annual' && (
                    <p className="text-sm text-gray-600 mt-1">
                      {getPriceDisplay(plan).annual}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 min-h-[200px]">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan(plan)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center ${
                    getButtonStyle(plan)
                  } ${(isCurrentPlan(plan)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {getButtonText(plan)}
                  {!isCurrentPlan(plan) && !plan.customPricing && plan.id !== 'free' && (
                    <ChevronRight className="w-4 h-4 ml-2" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl shadow-md p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              All plans include
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Real-time Updates</h3>
                </div>
                <p className="text-gray-600 text-sm ml-13">
                  Get instant notifications about litter incidents in your monitored areas
                </p>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">API Access</h3>
                </div>
                <p className="text-gray-600 text-sm ml-13">
                  Integrate CleanApp data into your existing systems
                </p>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Sparkles className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">24/7 Support</h3>
                </div>
                <p className="text-gray-600 text-sm ml-13">
                  Our team is here to help you make the most of CleanApp
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ or Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Questions about our plans?{' '}
            <a href="#" className="text-green-600 font-semibold hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}