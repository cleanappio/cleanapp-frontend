import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useForm } from 'react-hook-form';
import { authApiClient } from '@/lib/auth-api-client';
import { useTranslations } from '@/lib/i18n';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { t } = useTranslations();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();
  const password = watch('password');

  // Get token from URL
  useEffect(() => {
    if (router.isReady) {
      const urlToken = router.query.token;
      if (typeof urlToken === 'string') {
        setToken(urlToken);
      }
    }
  }, [router.isReady, router.query]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error(t('invalidResetLink') || 'Invalid reset link');
      return;
    }

    setIsLoading(true);
    try {
      await authApiClient.resetPassword(token, data.password);
      setIsSuccess(true);
      toast.success(t('passwordResetSuccess') || 'Password reset successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('somethingWentWrong') || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error if no token
  if (router.isReady && !token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>CleanApp - Reset Password</title>
        </Head>
        <PageHeader />
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-800 mb-2">
                {t('invalidResetLink') || 'Invalid Reset Link'}
              </h2>
              <p className="text-red-600 mb-4">
                {t('resetLinkExpiredOrInvalid') || 'This password reset link is invalid or has expired.'}
              </p>
              <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
                {t('backToLogin') || 'Back to Login'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success message
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>CleanApp - Password Reset Successful</title>
        </Head>
        <PageHeader />
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-green-800 mb-2">
                {t('passwordResetSuccess') || 'Password Reset Successful!'}
              </h2>
              <p className="text-green-600 mb-4">
                {t('canNowLogin') || 'You can now log in with your new password.'}
              </p>
              <Link
                href="/login"
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {t('goToLogin') || 'Go to Login'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>CleanApp - Reset Password</title>
      </Head>
      <PageHeader />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('resetYourPassword') || 'Reset Your Password'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('enterNewPassword') || 'Enter your new password below'}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password" className="sr-only">
                  {t('newPassword') || 'New Password'}
                </label>
                <input
                  {...register('password', {
                    required: t('passwordRequired') || 'Password is required',
                    minLength: {
                      value: 8,
                      message: t('passwordMinLength') || 'Password must be at least 8 characters'
                    }
                  })}
                  type="password"
                  autoComplete="new-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder={t('newPassword') || 'New Password'}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  {t('confirmPassword') || 'Confirm Password'}
                </label>
                <input
                  {...register('confirmPassword', {
                    required: t('confirmPasswordRequired') || 'Please confirm your password',
                    validate: value => value === password || (t('passwordsMustMatch') || 'Passwords must match')
                  })}
                  type="password"
                  autoComplete="new-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder={t('confirmPassword') || 'Confirm Password'}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (t('resettingPassword') || 'Resetting...') : (t('resetPassword') || 'Reset Password')}
              </button>
            </div>

            <div className="text-center">
              <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
                {t('backToLogin') || 'Back to Login'}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
