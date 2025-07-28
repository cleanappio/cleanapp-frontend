import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslations } from '@/lib/i18n';
import CustomAreaDashboard from '../components/CustomAreaDashboard';
import Head from 'next/head';

export default function MontenegroPage() {
  const router = useRouter();
  // Only subscribe to the specific auth state properties we need
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const { t } = useTranslations();

  // Memoize the map center to prevent unnecessary re-renders
  const mapCenter = useMemo(() => [42.7087, 19.3744] as [number, number], []);

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
        <title>{t('montenegroDashboard')} - CleanApp</title>
        <meta name="description" content={t('montenegroReports')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <CustomAreaDashboard 
        apiUrl={process.env.NEXT_PUBLIC_MONTENEGRO_API_URL || ''}
        mapCenter={mapCenter}
        areaName="Montenegro"
        areaFlag="🇲🇪"
      />
    </>
  );
} 