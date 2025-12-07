import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslations } from '@/lib/i18n';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslations();

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>();

  // Handle redirect parameter
  useEffect(() => {
    const { redirect } = router.query;
    if (redirect && typeof redirect === 'string') {
      // Store the redirect URL in session storage
      sessionStorage.setItem('authRedirect', redirect);
    }
  }, [router.query]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success(t('welcomeBack'));

      // Check for stored redirect URL
      const redirectUrl = sessionStorage.getItem('authRedirect');
      if (redirectUrl) {
        sessionStorage.removeItem('authRedirect');
        router.replace(redirectUrl);
      } else {
        router.replace('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = getValues('email');
    if (!email) {
      toast.error(t('emailRequired'));
      return;
    }
    if (!/^\S+@\S+$/i.test(email)) {
      toast.error(t('invalidEmailAddress'));
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email);
      toast.success(t('resetLinkSent'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>CleanApp - Login</title>
      </Head>
      <PageHeader />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('diveIntoInsights')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('or')}{' '}
              <Link href="/signup" className="font-medium text-green-600 hover:text-green-500">
                {t('startFreeTrial')}
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  {t('emailAddress')}
                </label>
                <input
                  {...register('email', {
                    required: t('emailRequired'),
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: t('invalidEmailAddress')
                    }
                  })}
                  type="email"
                  autoComplete="email"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder={t('emailAddress')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  {t('password')}
                </label>
                <input
                  {...register('password', { required: t('passwordRequired') })}
                  type="password"
                  autoComplete="current-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder={t('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('signingIn') : t('signIn')}
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('resetPassword')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
