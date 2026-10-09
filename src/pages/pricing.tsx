import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import Seo from '@/components/Seo';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslations } from '@/lib/i18n';
import { breadcrumbJsonLd, faqJsonLd, jsonLdGraph, webPageJsonLd } from '@/lib/seo';

type PlanId = 'free' | 'pro' | 'enterprise';
type ApiPlanType = 'base' | 'advanced';
type Cycle = 'monthly' | 'annual';

interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  apiPlanType?: ApiPlanType;
  /** Shown when the live price list has not loaded. Stripe is the source of truth at checkout. */
  fallbackMonthly: number;
  highlight?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Report anything. See everything public.',
    fallbackMonthly: 0,
    features: [
      'Unlimited reporting on iOS, Android and web',
      'Live public map of physical and digital reports',
      'Public brand pages with recent reports',
      'Community trends',
    ],
  },
  {
    id: 'pro',
    name: 'CleanApp Pro',
    tagline: 'For one brand, store, venue or site.',
    apiPlanType: 'base',
    fallbackMonthly: 99,
    highlight: true,
    features: [
      'One brand or place',
      'Real-time alerts for every report about you',
      'AI insights: severity, trends, urgency',
      'Incident and hotspot tracking',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'CleanApp Enterprise',
    tagline: 'For portfolios, multi-site brands and teams.',
    apiPlanType: 'advanced',
    fallbackMonthly: 499,
    features: [
      'Everything in Pro',
      'Up to five brands or places',
      'Risk and hotspot forecasting',
      'Custom dashboards',
      'Dedicated account manager',
    ],
  },
];

type MatrixRow = { label: string; free: string | boolean; pro: string | boolean; enterprise: string | boolean };

const MATRIX: MatrixRow[] = [
  { label: 'Brands or places monitored', free: 'Public only', pro: '1', enterprise: 'Up to 5' },
  { label: 'Live public map', free: true, pro: true, enterprise: true },
  { label: 'Real-time alerts', free: false, pro: true, enterprise: true },
  { label: 'AI severity, trend and urgency insights', free: false, pro: true, enterprise: true },
  { label: 'Incident and hotspot tracking', free: false, pro: true, enterprise: true },
  { label: 'Risk and hotspot forecasting', free: false, pro: false, enterprise: true },
  { label: 'Custom dashboards', free: false, pro: false, enterprise: true },
  { label: 'Support', free: 'Community', pro: 'Priority', enterprise: 'Dedicated account manager' },
];

const FAQS = [
  {
    question: 'Who pays for CleanApp?',
    answer:
      'Reporting is free, always. Brands, property owners and operators pay for what those reports become: real-time alerts, AI insight and a clear record of what was reported about them and where.',
  },
  {
    question: 'What counts as a brand or place?',
    answer:
      'A brand is a name CleanApp detects in reports: on packaging, storefronts, products, websites or apps. A place is an area you draw on the map: a store, venue, building, campus or site. Pro covers one; Enterprise covers up to five.',
  },
  {
    question: 'Can I change or cancel my plan?',
    answer:
      'Yes. Upgrade, downgrade or cancel from the billing page at any time. Changes take effect at the next billing cycle.',
  },
  {
    question: 'We have more than five brands or sites.',
    answer:
      'Enterprise can be extended. Email info@cleanapp.io with the number of brands and locations and we will set it up.',
  },
];

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="h-5 w-5 text-green-600 mx-auto" aria-label="Included" />;
  if (value === false) return <Minus className="h-5 w-5 text-gray-300 mx-auto" aria-label="Not included" />;
  return <span className="text-sm text-gray-700">{value}</span>;
}

export default function PricingPage() {
  const router = useRouter();
  const { subscription, prices, fetchPrices, isAuthenticated } = useAuthStore();
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const { t } = useTranslations();

  useEffect(() => {
    fetchPrices().catch(() => {
      /* fall back to listed prices */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Live price for a plan and cycle from the API, in major units, or null if not loaded. */
  const livePrice = (plan: Plan, forCycle: Cycle) => {
    if (!plan.apiPlanType) return { amount: 0, currency: 'USD' };
    const match = prices.find((p) => p.product === plan.apiPlanType && p.period === forCycle);
    return match ? { amount: match.amount / 100, currency: match.currency.toUpperCase() } : null;
  };

  // Only offer the annual toggle when the API actually has annual prices.
  const annualAvailable = PLANS.filter((p) => p.apiPlanType).every((p) => livePrice(p, 'annual'));
  const effectiveCycle: Cycle = annualAvailable ? cycle : 'monthly';

  const displayPrice = (plan: Plan) => {
    const live = livePrice(plan, effectiveCycle);
    const currency = live?.currency ?? 'USD';
    const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
    if (plan.fallbackMonthly === 0) return { main: '$0', sub: 'Free forever. No account needed to report.' };
    if (effectiveCycle === 'annual' && live) {
      return {
        main: `${symbol}${Math.round(live.amount / 12)}`,
        sub: `per month, ${symbol}${Math.round(live.amount)} billed annually`,
      };
    }
    const monthly = live ? live.amount : plan.fallbackMonthly;
    return { main: `${symbol}${Math.round(monthly)}`, sub: 'per month, billed monthly' };
  };

  const annualSavings = () => {
    const pro = PLANS[1];
    const m = livePrice(pro, 'monthly');
    const a = livePrice(pro, 'annual');
    if (!m || !a || m.amount === 0) return null;
    const pct = Math.round((1 - a.amount / (m.amount * 12)) * 100);
    return pct > 0 ? pct : null;
  };

  const isCurrentPlan = (plan: Plan) => {
    if (!isAuthenticated) return false;
    if (!subscription) return plan.id === 'free';
    return plan.apiPlanType === subscription.plan_type && effectiveCycle === subscription.billing_cycle;
  };

  const buttonLabel = (plan: Plan) => {
    if (isCurrentPlan(plan)) return t('currentPlan');
    if (plan.id === 'free') return subscription ? t('downgrade') : 'Get the free app';
    return subscription ? t('changeNow') : `Start with ${plan.name.replace('CleanApp ', '')}`;
  };

  const selectPlan = (plan: Plan) => {
    if (isCurrentPlan(plan)) return;
    if (plan.id === 'free') {
      if (!subscription) {
        router.push('/download');
        return;
      }
      router.push('/billing');
      toast('To downgrade to Free, cancel your subscription from the billing page.');
      return;
    }
    const price = displayPrice(plan);
    router.push({
      pathname: '/checkout',
      query: { plan: plan.apiPlanType, billing: effectiveCycle, displayPrice: `${price.main}/mo` },
    });
  };

  const savings = annualSavings();

  return (
    <>
      <Seo
        title="CleanApp Pricing – Free Reporting, Pro $99/mo, Enterprise $499/mo"
        description="Reporting is free for everyone. Brands and property owners get real-time alerts, AI insights and hotspot tracking with CleanApp Pro ($99/mo) or Enterprise ($499/mo, up to five sites)."
        path="/pricing"
        jsonLd={jsonLdGraph([
          webPageJsonLd({
            path: '/pricing',
            title: 'CleanApp Pricing',
            description: 'CleanApp plans: Free for reporters, Pro at $99 per month for one brand or place, Enterprise at $499 per month for up to five.',
          }),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
          faqJsonLd(FAQS),
        ])}
      />
      <div className="min-h-screen bg-white">
        <PageHeader />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="pt-16 pb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Pricing</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Plans for brands and places
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
              Reporting is free for everyone. Organizations pay for what those reports become:
              alerts, insight and action.
            </p>

            {annualAvailable && (
              <div className="mt-8 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 text-sm font-medium">
                {(['monthly', 'annual'] as Cycle[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={`px-4 py-2 rounded-full transition-colors ${
                      cycle === c ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {c === 'monthly' ? 'Monthly' : 'Annual'}
                    {c === 'annual' && savings ? (
                      <span className="ml-1.5 text-green-500">save {savings}%</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Plan cards */}
          <section className="grid gap-6 lg:grid-cols-3 items-stretch">
            {PLANS.map((plan) => {
              const price = displayPrice(plan);
              const current = isCurrentPlan(plan);
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlight
                      ? 'border-green-600 shadow-lg shadow-green-100 ring-1 ring-green-600'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-8 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      Most popular
                    </span>
                  )}
                  {current && (
                    <span className="absolute -top-3 right-8 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      Current plan
                    </span>
                  )}

                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{plan.tagline}</p>

                  <div className="mt-6">
                    <span className="text-5xl font-bold tracking-tight text-gray-900">{price.main}</span>
                    <p className="mt-1 text-sm text-gray-500">{price.sub}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => selectPlan(plan)}
                    disabled={current}
                    className={`mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                      current
                        ? 'bg-gray-100 text-gray-500 cursor-default'
                        : plan.highlight
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    {buttonLabel(plan)}
                  </button>

                  <ul className="mt-8 space-y-3 text-sm text-gray-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <Check className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          <p className="mt-6 text-center text-sm text-gray-500">
            Prices in USD. Taxes may apply. Cancel any time from your billing page.
          </p>

          {/* Comparison */}
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Compare plans</h2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 text-sm font-semibold text-gray-500 w-2/5">Feature</th>
                    {PLANS.map((plan) => (
                      <th key={plan.id} className="py-3 px-4 text-center text-sm font-semibold text-gray-900">
                        {plan.name.replace('CleanApp ', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.label} className="border-b border-gray-100">
                      <td className="py-4 pr-4 text-sm text-gray-700">{row.label}</td>
                      <td className="py-4 px-4 text-center"><CellValue value={row.free} /></td>
                      <td className="py-4 px-4 text-center"><CellValue value={row.pro} /></td>
                      <td className="py-4 px-4 text-center"><CellValue value={row.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Questions</h2>
            <dl className="mt-8 divide-y divide-gray-200">
              {FAQS.map((faq) => (
                <div key={faq.question} className="py-5">
                  <dt className="font-semibold text-gray-900">{faq.question}</dt>
                  <dd className="mt-2 text-gray-600 leading-relaxed">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Closing CTA */}
          <section className="mt-20 mb-8 rounded-2xl bg-gray-900 px-8 py-12 text-center text-white">
            <h2 className="text-2xl font-bold">Not sure which plan fits?</h2>
            <p className="mt-3 text-gray-300 max-w-xl mx-auto">
              Tell us how many brands and locations you care about and we will point you to the
              right one, or build something bigger.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="mailto:info@cleanapp.io?subject=CleanApp%20plans"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Talk to us
              </a>
              <Link
                href="/solutions/brands"
                className="rounded-lg border border-gray-600 px-5 py-3 text-sm font-semibold text-white hover:border-gray-400"
              >
                See what brands get
              </Link>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
