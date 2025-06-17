import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronRight, Check, MapPin, BarChart3, Building2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  priceAmount?: number;
  billingCycle?: 'monthly' | 'annual';
  features: string[];
  apiPlanType?: 'base' | 'advanced' | 'exclusive';
  popular?: boolean;
  customPricing?: boolean;
}

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'forever free',
      price: 'Free',
      priceAmount: 0,
      features: ['web access to CleanAppMap']
    },
    {
      id: 'lite',
      name: 'lite',
      price: '$100/mo',
      priceAmount: 100,
      apiPlanType: 'base',
      features: [
        'real time data subscription',
        'AI analytics (material composition, brand analysis, urgency ratings) for 1 location (geoquadrant) -or- 1 brand (eg, Redbull, Starbucks)',
        'access to CleanApp responder app'
      ]
    },
    {
      id: 'enterprise',
      name: 'enterprise',
      price: '$500/mo',
      priceAmount: 500,
      apiPlanType: 'advanced',
      popular: true,
      features: [
        'lite tier, plus:',
        'priority access to AI hotspot mapping & predictive analytics for up to 5 locations -or- 5 brands',
        'integration support for firmware',
        'custom web dashboard'
      ]
    },
    {
      id: 'civic',
      name: 'civic',
      price: 'case-by-case',
      apiPlanType: 'exclusive',
      customPricing: true,
      features: [
        'enterprise tier, plus:',
        'support for integration with existing smart-city incident reporting platforms (eg, Open311)'
      ]
    }
  ];

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      router.push('/signup');
      return;
    }

    if (plan.id === 'free') {
      router.push('/dashboard');
      return;
    }

    if (plan.customPricing) {
      toast.success('Please contact our sales team for custom pricing');
      return;
    }

    // Navigate to checkout with plan details
    router.push({
      pathname: '/checkout',
      query: {
        plan: plan.apiPlanType,
        billing: billingCycle
      }
    });
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <MapPin className="w-6 h-6" />;
      case 'lite':
        return <Sparkles className="w-6 h-6" />;
      case 'enterprise':
        return <BarChart3 className="w-6 h-6" />;
      case 'civic':
        return <Building2 className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getMonthlyPrice = (plan: SubscriptionPlan) => {
    if (!plan.priceAmount || plan.priceAmount === 0) return 0;
    return billingCycle === 'annual' ? Math.round(plan.priceAmount * 0.8) : plan.priceAmount;
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
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

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
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
              Annual <span className="text-sm">(Save 20%)</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl"
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 text-sm font-semibold rounded-bl-lg">
                  Popular
                </div>
              )}

              {/* Plan Header with Icon */}
              <div className="p-6 bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-600 text-white rounded-lg">
                    {getPlanIcon(plan.id)}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-green-700">
                  {plan.name}
                </h3>
              </div>

              {/* Plan Details */}
              <div className="p-6">
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.customPricing ? (
                      <span className="text-xl">Contact us</span>
                    ) : plan.priceAmount === 0 ? (
                      'Free'
                    ) : (
                      <>
                        ${getMonthlyPrice(plan)}
                        <span className="text-base font-normal text-gray-600">
                          /mo
                        </span>
                      </>
                    )}
                  </span>
                  {billingCycle === 'annual' && plan.priceAmount && plan.priceAmount > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      ${plan.priceAmount * 12 * 0.8}/year
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-md font-semibold transition-colors flex items-center justify-center ${
                    plan.id === 'free'
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : plan.customPricing
                      ? 'bg-gray-800 text-white hover:bg-gray-900'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {plan.id === 'free' ? (
                    'Get Started'
                  ) : plan.customPricing ? (
                    'Contact Sales'
                  ) : (
                    <>
                      Subscribe Now
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              All plans include
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Real-time Updates
                </h3>
                <p className="text-gray-600 text-sm">
                  Get instant notifications about litter incidents in your monitored areas
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  API Access
                </h3>
                <p className="text-gray-600 text-sm">
                  Integrate CleanApp data into your existing systems
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  24/7 Support
                </h3>
                <p className="text-gray-600 text-sm">
                  Our team is here to help you make the most of CleanApp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
