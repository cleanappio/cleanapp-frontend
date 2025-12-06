import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, CreditCard, Plus, ChevronDown, ChevronUp, LogOut, Check, Globe, MapPin } from 'lucide-react';

import { authApiClient } from '@/lib/auth-api-client';
import { areasApiClient, Area } from '@/lib/areas-api-client';
import { apiClient } from '@/lib/api-client';
import Image from 'next/image';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import AreasSelection from '@/components/AreasSelection';
import { useTranslations } from '@/lib/i18n';
import { Feature } from 'geojson';

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

interface CheckoutFormProps {
  planType: string;
  billingCycle: 'monthly' | 'annual';
  displayPrice: string;
}

// Using Area type from areas-api-client

function CheckoutForm({ planType, billingCycle, displayPrice }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const {
    user,
    isAuthenticated,
    subscription,
    login,
    signup,
    paymentMethods,
    fetchPaymentMethods,
    createSubscription,
    updateSubscription,
    addPaymentMethod,
    addCustomerBrands,
  } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userExists, setUserExists] = useState<null | boolean>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAuthComplete, setIsAuthComplete] = useState(isAuthenticated);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [brands, setBrands] = useState<Array<{ name: string; isPublic: boolean }>>([{ name: '', isPublic: false }]);
  const [selectedAreas, setSelectedAreas] = useState<Area[]>([]);
  const [drawnAreas, setDrawnAreas] = useState<Area[]>([]);
  const [publicAreaIds, setPublicAreaIds] = useState<Set<number>>(new Set());
  const { t } = useTranslations();

  // Brand management functions
  const addBrand = () => {
    setBrands(prev => [...prev, { name: '', isPublic: false }]);
  };

  const removeBrand = (index: number) => {
    setBrands(prev => prev.filter((_, i) => i !== index));
  };

  const updateBrand = (index: number, field: 'name' | 'isPublic', value: string | boolean) => {
    setBrands(prev => prev.map((brand, i) =>
      i === index ? { ...brand, [field]: value } : brand
    ));
  };

  // Check if user exists on email blur
  const handleEmailBlur = async () => {
    if (!email) return;
    setIsAuthLoading(true);
    setUserExists(null);
    try {
      // Use the new API to check if user exists
      const exists = await authApiClient.userExists(email);
      console.log('User exists:', exists);
      setUserExists(exists);
      // Focus password field if user exists
      if (exists && passwordRef.current) {
        setTimeout(() => passwordRef.current?.focus(), 100);
      }
    } catch (error: any) {
      console.error('Failed to check user existence:', error);
      // Fallback: treat as user not found
      setUserExists(false);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle login on password blur if user exists
  const handlePasswordBlur = async () => {
    if (!userExists || !email || !password) return;
    setIsAuthLoading(true);
    try {
      await login(email, password);
      toast.success(t('loggedIn'));
      setIsAuthComplete(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('loginFailed'));
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle signup on confirm password blur if user does not exist
  const handleConfirmPasswordBlur = async () => {
    if (userExists !== false || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }
    setIsAuthLoading(true);
    try {
      await signup(email, email, password); // Use email as name for simplicity
      toast.success(t('accountCreated'));
      setIsAuthComplete(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('signupFailed'));
    } finally {
      setIsAuthLoading(false);
    }
  };

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

  useEffect(() => {
    if (isAuthComplete) {
      fetchPaymentMethodsData();
    }
  }, [isAuthComplete]);

  // Watch for changes to paymentMethods from the store
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedPaymentMethod) {
      const defaultMethod = paymentMethods.find(m => m.is_default);
      setSelectedPaymentMethod(defaultMethod ? defaultMethod.stripe_payment_method_id : paymentMethods[0].stripe_payment_method_id);
    } else if (paymentMethods.length === 0) {
      setShowNewPaymentForm(true);
      setSelectedPaymentMethod('new');
      setSetAsDefault(true);
    }
  }, [paymentMethods, selectedPaymentMethod]);

  const getPlanDetails = () => {
    return {
      name: planType,
      displayPrice: displayPrice
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
          toast.error(t('cardElementNotFound'));
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
          toast.error(error.message || t('paymentFailed'));
          setIsProcessing(false);
          return;
        }

        if (!paymentMethod) {
          toast.error(t('paymentMethodCreationFailed'));
          setIsProcessing(false);
          return;
        }

        console.log('New payment method created:', paymentMethod);

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

      // Handle areas for subscription
      const hasSelectedAreas = selectedAreas.length > 0;
      const hasDrawnAreas = drawnAreas.length > 0;

      if (hasSelectedAreas || hasDrawnAreas) {
        console.log('Areas for subscription:', { selected: selectedAreas.length, drawn: drawnAreas.length });

        try {

          // Step 1: Collect existing selected area IDs
          const selectedAreaIds: number[] = selectedAreas.map(area => area.id!).filter(id => id !== undefined);
          console.log('Existing selected area IDs:', selectedAreaIds);

          // Step 2: Create only drawn areas and collect their IDs
          const drawnAreaIds: number[] = [];
          if (hasDrawnAreas) {
            for (const area of drawnAreas) {
              const response = await areasApiClient.createArea(area);
              console.log(`Drawn area created with ID: ${response.area_id}, message: ${response.message}`);
              drawnAreaIds.push(response.area_id);
            }
          }

          // Step 3: Combine all area IDs (existing selected + newly created drawn)
          const allAreaIds = [...selectedAreaIds, ...drawnAreaIds];
          console.log(`Total area IDs for customer: ${allAreaIds.length} (${selectedAreaIds.length} selected + ${drawnAreaIds.length} drawn)`, allAreaIds);

          // Step 4: Update customer with all area IDs
          const customerAreas = allAreaIds.map(areaId => ({
            customer_id: '', // Will be set by backend based on authenticated user
            area_id: areaId,
            is_public: publicAreaIds.has(areaId), // Use checkbox value
            created_at: new Date().toISOString()
          }));
          const updateResponse = await apiClient.updateCustomerAreas({ areas: customerAreas });
          console.log('Customer areas updated successfully:', updateResponse);

          // Show success messages
          if (hasSelectedAreas) {
            toast.success(t('areasSelectedForSubscription', { count: selectedAreas.length, plural: selectedAreas.length !== 1 ? 's' : '' }));
          }
          if (hasDrawnAreas) {
            toast.success(t('drawnAreasCreatedForSubscription', { count: drawnAreas.length, plural: drawnAreas.length !== 1 ? 's' : '' }));
          }
        } catch (error) {
          console.error('Error saving areas to backend:', error);
          toast.error('Failed to save service areas. Please try again.');
        }
      }

      // Check if user has existing subscription and call appropriate method
      if (subscription) {
        // If adding a new payment method, add it first
        if (showNewPaymentForm && setAsDefault) {
          try {
            await addPaymentMethod(paymentMethodId, true);
          } catch (error) {
            console.log('Failed to add payment method, continuing with subscription update');
          }
        }
        await updateSubscription(planType, billingCycle);
        toast.success(t('subscriptionUpdatedSuccessfully'));
      } else {
        await createSubscription(planType, billingCycle, paymentMethodId);
        toast.success(t('subscriptionCreatedSuccessfully'));

        // Add brand names if provided
        const validBrands = brands.filter(brand => brand.name.trim());
        if (validBrands.length > 0) {
          try {
            const brandData = validBrands.map(brand => ({
              brand_name: brand.name.trim(),
              is_public: brand.isPublic
            }));
            await addCustomerBrands({ brands: brandData });
            toast.success(t('brandNameAdded'));
          } catch (error) {
            console.error('Failed to add brand names:', error);
            toast.error(t('brandNameError'));
          }
        }
      }

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || t('failedToCreateSubscription'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!planDetails) {
    return <div>{t('invalidPlanSelected')}</div>;
  }

  if (isAuthComplete && loadingPaymentMethods) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-sm text-gray-600">{t('loadingPaymentMethods')}</span>
      </div>
    );
  }

  // If not authenticated, show login/signup box above the checkout form
  if (!isAuthComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Login/Signup Box */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('signUpOrLogInToContinue')}</h3>
          <div className="mb-4">
            <label htmlFor="checkout-email" className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input
              type="email"
              id="checkout-email"
              value={email}
              onChange={e => { setEmail(e.target.value); setUserExists(null); setIsAuthComplete(false); }}
              onBlur={handleEmailBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              disabled={isAuthLoading}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="checkout-password" className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input
              ref={passwordRef}
              type="password"
              id="checkout-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={userExists ? handlePasswordBlur : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              disabled={isAuthLoading || userExists === null}
            />
          </div>
          {/* Show confirm password only if user does not exist */}
          {userExists === false && (
            <div className="mb-4">
              <label htmlFor="checkout-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword')}</label>
              <input
                type="password"
                id="checkout-confirm-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onBlur={handleConfirmPasswordBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                disabled={isAuthLoading}
              />
            </div>
          )}
          {isAuthLoading && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="ml-2 text-sm text-gray-600">
                {userExists === null ? t('checking') : userExists ? t('loggingIn') : t('creatingAccount')}
              </span>
            </div>
          )}
        </div>

        {/* Checkout Form - Disabled */}
        <form onSubmit={handleSubmit} className="opacity-50 pointer-events-none">
          {/* Brand Name Information - Disabled */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              {t('brandName')}
            </h3>
            <p className="text-gray-500 text-sm mb-4">{t('brandNameDescription')}</p>
            <div className="space-y-3">
              {brands.map((brand, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={brand.name}
                    onChange={(e) => updateBrand(index, 'name', e.target.value)}
                    placeholder={t('brandNamePlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    disabled
                  />
                  <label className="flex items-center space-x-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={brand.isPublic}
                      onChange={(e) => updateBrand(index, 'isPublic', e.target.checked)}
                      disabled
                      className="w-3 h-3 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span>{t('public')}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Areas Selection - Disabled */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                {t('serviceAreas')}
              </h3>
              <button
                type="button"
                disabled
                className="text-gray-400 text-sm font-medium cursor-not-allowed"
              >
                {t('selectServiceAreas')}
              </button>
            </div>

            <p className="text-sm text-gray-500">
              {t('pleaseCompleteAuthenticationToSelectAreas')}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">{t('subscriptionSummary')}</h3>
            <div className="border-b pb-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('plan')}</span>
                <span className="font-medium">{planDetails.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('billingCycle')}</span>
                <span className="font-medium capitalize">{billingCycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('total')}</span>
                <span className="font-bold text-lg">{planDetails.displayPrice}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              {t('paymentInformation')}
            </h3>
            <p className="text-gray-500 text-sm mb-4">{t('pleaseCompleteAuthenticationToContinueWithCheckout')}</p>

            {/* Existing Payment Methods */}
            {paymentMethods.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">{t('selectPaymentMethod')}</p>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center p-3 border rounded-lg cursor-not-allowed transition-colors ${selectedPaymentMethod === method.stripe_payment_method_id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200'
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.stripe_payment_method_id}
                        checked={selectedPaymentMethod === method.stripe_payment_method_id}
                        onChange={() => { }}
                        disabled
                        className="mr-3 text-green-600 focus:ring-green-500"
                      />
                      <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last_four}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('expires')} {method.exp_month}/{method.exp_year}
                        </p>
                      </div>
                      {method.is_default && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{t('default')}</span>
                      )}
                    </label>
                  ))}

                  {/* Add New Payment Method Option */}
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center p-3 border rounded-lg transition-colors border-gray-200 text-gray-400 cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('addNewPaymentMethod')}
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  </button>
                </div>
              </div>
            )}

            {/* New Payment Method Form */}
            {showNewPaymentForm && (
              <div className={`space-y-4 ${paymentMethods.length > 0 ? 'mt-4 pt-4 border-t' : ''}`}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    required={showNewPaymentForm}
                    disabled
                  />
                </div>

                <div>
                  <label htmlFor="cardholder-name" className="block text-sm font-medium text-gray-400 mb-1">{t('cardholderName')}</label>
                  <input
                    type="text"
                    id="cardholder-name"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    required={showNewPaymentForm}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t('cardInformation')}</label>
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled
              className="w-full mt-6 bg-gray-300 text-gray-500 py-3 px-4 rounded-md font-semibold cursor-not-allowed flex items-center justify-center"
            >
              <Lock className="w-5 h-5 mr-2" />
              {t('subscribe')} {planDetails.displayPrice}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">{t('yourPaymentInformationIsEncryptedAndSecure')}</p>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <Head>
        <title>CleanApp - Checkout</title>
      </Head>
      {/* Auth Status Box */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-green-600">
          <Check className="w-5 h-5 mr-2" />
          {t('authenticationComplete')}
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>{t('email')}:</strong> {email}</p>
          <p><strong>{t('status')}:</strong> {t('readyToCheckout')}</p>
        </div>
      </div>

      {/* Subscription Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{t('subscriptionSummary')}</h3>
        <div className="border-b pb-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{t('plan')}</span>
            <span className="font-medium">{planDetails.name}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{t('billingCycle')}</span>
            <span className="font-medium capitalize">{billingCycle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('total')}</span>
            <span className="font-bold text-lg">{planDetails.displayPrice}</span>
          </div>
        </div>
      </div>

      {/* Brand Name Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          {t('brandName')}
        </h3>
        <p className="text-gray-500 text-sm mb-4">{t('brandNameDescription')}</p>
        <div className="space-y-3">
          {brands.map((brand, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="text"
                value={brand.name}
                onChange={(e) => updateBrand(index, 'name', e.target.value)}
                placeholder={t('brandNamePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <label className="flex items-center space-x-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={brand.isPublic}
                  onChange={(e) => updateBrand(index, 'isPublic', e.target.checked)}
                  className="w-3 h-3 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span>{t('public')}</span>
              </label>
              {brands.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBrand(index)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Remove brand"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addBrand}
            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{t('addBrand')}</span>
          </button>
        </div>
      </div>

      {/* Areas Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            {t('serviceAreas')}
          </h3>
        </div>

        <p className="text-sm text-gray-500">
          {t('noAreasSelectedCheckout')}
        </p>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <AreasSelection
            onAreasChange={setSelectedAreas}
            onDrawnAreasChange={setDrawnAreas}
            initialSelectedAreas={selectedAreas.map(area => area.id?.toString() || '')}
            onPublicAreasChange={setPublicAreaIds}
          />
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          {t('paymentInformation')}
        </h3>

        {/* Existing Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('selectPaymentMethod')}</p>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedPaymentMethod === method.stripe_payment_method_id
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
                      {t('expires')} {method.exp_month}/{method.exp_year}
                    </p>
                  </div>
                  {method.is_default && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{t('default')}</span>
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
                className={`w-full flex items-center justify-center p-3 border rounded-lg transition-colors ${showNewPaymentForm
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900'
                  }`}
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('addNewPaymentMethod')}
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
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
              <label htmlFor="cardholder-name" className="block text-sm font-medium text-gray-700 mb-1">{t('cardholderName')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('cardInformation')}</label>
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
              <label htmlFor="set-as-default" className="ml-2 block text-sm text-gray-700">{t('setAsDefaultPaymentMethod')}</label>
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
              {t('processing')}
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              {t('subscribe')} {planDetails.displayPrice}
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">{t('yourPaymentInformationIsEncryptedAndSecure')}</p>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { plan, billing, displayPrice } = router.query;
  const { t } = useTranslations();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!plan || !billing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader />

        <div className="py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <p className="text-gray-600 mb-4">{t('noPlanSelected')}</p>
            <button
              onClick={() => router.push('/pricing')}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              &larr; {t('backToPricing')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />

      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/pricing')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToPricing')}
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('completeYourSubscription')}
          </h1>

          <Elements stripe={stripePromise}>
            <CheckoutForm
              planType={plan as string}
              billingCycle={billing as 'monthly' | 'annual'}
              displayPrice={displayPrice as string}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}