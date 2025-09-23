import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Head from 'next/head';
import { ChevronRight, Check, MapPin, BarChart3, Sparkles, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import { FaArrowLeftLong } from 'react-icons/fa6';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface BillingCycle {
  type: string;
  price: number;
  currency: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  billingCycles?: BillingCycle[];
  features: string[];
  apiPlanType?: 'base' | 'advanced' | 'exclusive';
  popular?: boolean;
  customPricing?: boolean;
  imageSrc?: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { user, isAuthenticated, subscription, prices, fetchPrices, logout } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { t } = useTranslations();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const fetchPricesData = async () => {
    await fetchPrices();
  };

  useEffect(() => {
    fetchPricesData();
  }, []);

  const getPricesForPlan = (planId: string) => {
    const pr = prices.filter((price) => price.product === planId) || {};
    return pr.map((price) => ({
      type: price.period,
      price: price.amount / 100, // Convert cents to dollars
      currency: price.currency.toUpperCase(),
    }));
  };

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: t('free'),
      description: t('forIndividualsAndSmallTeams'),
      billingCycles: [
        { type: 'monthly', price: 0, currency: 'USD' },
        { type: 'annual', price: 0, currency: 'USD' },
      ],
      features: [
        t('liveIssueMap'),
        t('submitUnlimitedReports'),
        t('communityTrends'),
        t('mobileWebAccess'),
      ],
      imageSrc: '/free.png',
    },
    {
      id: 'lite',
      name: t('cleanAppLive'),
      description: t('forBusinessesAndBrands'),
      apiPlanType: 'base',
      billingCycles: getPricesForPlan('base'),
      features: [
        t('liveDataAlerts'),
        t('aiPoweredInsights'),
        t('incidentHotspotTracking'),
        t('priorityHelp'),
      ],
      imageSrc: '/lite.png',
    },
    {
      id: 'enterprise',
      name: t('enterprise'),
      description: t('forOrganizationsManagingMultiple'),
      apiPlanType: 'advanced',
      billingCycles: getPricesForPlan('advanced'),
      popular: true,
      features: [
        t('allCleanAppLiveFeatures'),
        t('advancedRiskHotspotForecasting'),
        t('multiSiteBrandCoverage'),
        t('customDashboards'),
        t('dedicatedAccountManager'),
      ],
      imageSrc: '/enterprise.png',
    },
  ];

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    if (!subscription) {
      // If no subscription, user is on free plan
      return plan.id === 'free';
    }
    // Match the plan by apiPlanType
    return (
      plan.apiPlanType === subscription.plan_type &&
      billingCycle === subscription.billing_cycle
    );
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    // If it's the current plan, do nothing
    if (isCurrentPlan(plan)) {
      return;
    }

    if (plan.id === 'free' && subscription) {
      // Downgrading to free means cancelling subscription
      router.push('/billing');
      toast(
        'To downgrade to free, please cancel your subscription from the billing page'
      );
      return;
    }

    if (plan.customPricing) {
      toast.success('Please contact our sales team for custom pricing');
      return;
    }

    // Navigate to checkout with plan details (always, regardless of auth status)
    const display = getPriceDisplay(plan);
    const displayPrice =
      billingCycle === 'annual' ? display.annual : display.monthly;
    router.push({
      pathname: '/checkout',
      query: {
        plan: plan.apiPlanType,
        billing: billingCycle,
        displayPrice: displayPrice,
      },
    });
  };

  const getPriceDisplay = (plan: SubscriptionPlan) => {
    const price = plan.billingCycles?.find((bc) => bc.type === billingCycle);
    if (!price) {
      return {
        monthly: 'Contact Sales',
        annual: null,
      };
    }
    if (billingCycle === 'annual' && price) {
      return {
        monthly: `${price.price / 12} ${price.currency}/mo`,
        annual: `${price.price} ${price.currency}/yr`,
      };
    }
    return {
      monthly: `${price.price} ${price.currency}/mo`,
      annual: null,
    };
  };

  const getButtonText = (plan: SubscriptionPlan) => {
    if (isCurrentPlan(plan)) {
      return t('currentPlan');
    }

    if (!subscription && plan.id === 'free') {
      return t('currentPlan');
    }

    if (plan.id === 'free') {
      return t('downgrade');
    }

    if (plan.customPricing) {
      return t('contactSales');
    }

    // If user has any subscription, show 'Change now' for other plans
    if (subscription) {
      return t('changeNow');
    }

    // If no subscription (on free plan), show different text
    return t('subscribeNow');
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
    <>
      <Head>
        <title>CleanApp Pricing - Environmental Monitoring Plans</title>
        <meta name="description" content="Choose the perfect CleanApp plan for your environmental monitoring needs. From free individual tracking to enterprise solutions with AI insights." />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="CleanApp Pricing - Environmental Monitoring Plans" />
        <meta property="og:description" content="Choose the perfect CleanApp plan for your environmental monitoring needs. From free individual tracking to enterprise solutions with AI insights." />
        <meta property="og:image" content="https://cleanapp.io/cleanapp-logo-high-res.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:url" content="https://cleanapp.io/pricing" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CleanApp Pricing - Environmental Monitoring Plans" />
        <meta name="twitter:description" content="Choose the perfect CleanApp plan for your environmental monitoring needs. From free individual tracking to enterprise solutions with AI insights." />
        <meta name="twitter:image" content="https://cleanapp.io/cleanapp-logo-high-res.png" />
        
        {/* Telegram Specific Meta Tags */}
        <meta name="telegram:channel" content="@cleanapp" />
        <meta name="telegram:site" content="@cleanapp" />
      </Head>
      <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex items-center">
                <Image
                  src="/cleanapp-logo.png"
                  alt="CleanApp Logo"
                  width={200}
                  height={60}
                  className="h-12 w-auto"
                  priority
                />
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">{user?.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-x-4">
                  <Link
                    href="/login"
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    {t('signIn')}
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {t('getStarted')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

            <div className='py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <Link href='/'>
            <button className='flex items-center text-gray-600 hover:text-gray-900 mb-8'>
              <FaArrowLeftLong className='w-4 h-4 mr-2' />
              {t('backToMap')}
            </button>
          </Link>
          {/* Header */}
          <div className='text-center mb-12'>
            <div className='flex justify-center mb-4'>
              <Image
                src='/cleanapp-logo-high-res.png'
                alt='CleanApp Logo'
                width={125}
                height={100}
              />
            </div>
            <h1 className='text-5xl font-bold text-gray-900 mb-4'>
              {t('trashIsCash')}
            </h1>
            <p className='text-xl text-gray-600'>
              {t('liveInsightsLowerCosts')} <span className='font-bold'>{t('muchHigherMargins')}</span>
            </p>
          </div>

        {/* Billing Toggle - Only show if there are paid plans */}
        <div className='flex justify-center mb-12'>
          <div className='bg-white rounded-full shadow-sm p-1 inline-flex'>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-full transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('annual')} <span className='text-sm'>({t('discount')})</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg shadow-sm border ${
                plan.id === 'lite' ? 'ring-2 ring-green-600 shadow-lg' : ''
              }`}
            >
              {/* Current Plan Badge */}
              {isCurrentPlan(plan) && (
                <div className='absolute top-4 left-4 bg-green-600 text-white px-3 py-1 text-sm font-semibold rounded-full z-10'>
                  Current Plan
                </div>
              )}

              {/* Plan Image */}
              <div className='h-40 relative overflow-hidden'>
                <Image
                  src={plan.imageSrc || '/api/placeholder/400/300'}
                  alt={`${plan.name} plan`}
                  width={400}
                  height={160}
                  className='w-full h-full object-cover'
                  priority={plan.popular}
                />
                {plan.popular && !isCurrentPlan(plan) && (
                  <div className='absolute top-4 right-4 bg-green-600 text-white px-3 py-1 text-sm font-semibold rounded-full'>
                    Popular
                  </div>
                )}
              </div>

              {/* Plan Details */}
              <div className='p-6'>
                {/* Plan Name and Price */}
                <div className='text-center mb-6'>
                  <h3 className='text-2xl font-bold text-green-700 mb-2'>
                    {plan.name}
                  </h3>
                  <p>{plan.description}</p>

                  <p className='text-3xl font-bold text-gray-900 mt-4'>
                    {getPriceDisplay(plan).monthly}
                  </p>
                  {billingCycle === 'annual' && (
                    <p className='text-sm text-gray-600 mt-1'>
                      {getPriceDisplay(plan).annual}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className='space-y-3 mb-6 min-h-[200px]'>
                  {plan.features.map((feature, index) => (
                    <li key={index} className='flex items-start'>
                      <Check className='w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5' />
                      <span className='text-sm text-gray-700 leading-tight'>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan(plan)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center ${getButtonStyle(
                    plan
                  )} ${
                    isCurrentPlan(plan) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {getButtonText(plan)}
                  {!isCurrentPlan(plan) &&
                    !plan.customPricing &&
                    plan.id !== 'free' && (
                      <ChevronRight className='w-4 h-4 ml-2' />
                    )}
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
    </>
  );
}
