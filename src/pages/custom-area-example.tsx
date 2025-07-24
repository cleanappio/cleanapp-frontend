import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslations } from '@/lib/i18n';
import CustomAreaDashboard from '../components/CustomAreaDashboard';
import Head from 'next/head';

export default function CustomAreaExamplePage() {
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
        <title>Custom Area Dashboard Example - CleanApp</title>
        <meta name="description" content="Example of using CustomAreaDashboard component" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <CustomAreaDashboard 
        apiUrl={process.env.NEXT_PUBLIC_MONTENEGRO_API_URL || ''}
        mapCenter={[42.7087, 19.3744]} // Example coordinates
        adminLevel={2} // Country level
        subAdminLevel={6} // Municipality level
        countryOsmId={-53296} // Example OSM ID
        areaName="Example Area"
        areaFlag="🏳️"
      />
    </>
  );
} 