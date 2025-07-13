import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import MontenegroDashboard from '../components/MontenegroDashboard';
import Head from 'next/head';

export default function MontenegroPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
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
        <title>Montenegro Dashboard - CleanApp</title>
        <meta name="description" content="Interactive map dashboard for Montenegro with city information and statistics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <MontenegroDashboard />
    </>
  );
} 