import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslations } from '@/lib/i18n';
import RedBullDashboard from '../components/RedBullDashboard';
import Head from 'next/head';

export default function RedBullPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { t } = useTranslations();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <>
      <Head>
        <title>{t('brandDashboard')} - CleanApp</title>
        <meta name="description" content={t('brandReports')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <RedBullDashboard />
    </>
  );
} 