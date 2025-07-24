"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslations } from '@/lib/i18n';
import { LogOut } from "lucide-react";
import LanguageSwitcher from './LanguageSwitcher';

interface CustomAreaDashboardProps {
  apiUrl: string;
  mapCenter: [number, number];
  adminLevel: number;
  subAdminLevel: number;
  countryOsmId: number;
  areaName: string;
  areaFlag?: string;
}

export default function CustomAreaDashboard({ 
  apiUrl, 
  mapCenter, 
  adminLevel, 
  subAdminLevel, 
  countryOsmId, 
  areaName,
  areaFlag
}: CustomAreaDashboardProps) {
  const [isClient, setIsClient] = useState(false);
  const { t } = useTranslations();
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Dynamically import the entire map component to avoid SSR issues
  const CustomAreaMap = dynamic(
    () => import('./CustomAreaMap'),
    { 
      ssr: false,
      loading: () => (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading')} {t('map').toLowerCase()}...</p>
          </div>
        </div>
      )
    }
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')} {areaName.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/cleanapp-logo.png"
                alt={t('cleanAppLogo')}
                width={150}
                height={45}
                className="h-9 w-auto"
                priority
              />
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">{areaName} {t('dashboard')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            {areaFlag && (
              <span className="text-sm text-gray-500">{areaFlag} {areaName}</span>
            )}
            
            <LanguageSwitcher />
            
            {/* Authentication Controls */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={t('signOut')}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
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
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {/* Map Container */}
        <div className="h-full relative">
          <CustomAreaMap 
            mapCenter={mapCenter}
            apiUrl={apiUrl}
            adminLevel={adminLevel}
            subAdminLevel={subAdminLevel}
            countryOsmId={countryOsmId}
            areaName={areaName}
          />
        </div>
      </div>
    </div>
  );
} 