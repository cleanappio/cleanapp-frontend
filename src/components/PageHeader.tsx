import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslations } from '@/lib/i18n';
import { useRouter } from 'next/router';
import LanguageSwitcher from './LanguageSwitcher';

const PageHeader: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { t } = useTranslations();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <Image
                src="/cleanapp-logo.png"
                alt={t('cleanAppLogo')}
                width={200}
                height={60}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">{user?.email}</span>
                    <button
                      onClick={handleLogout}
                      className="text-gray-500 hover:text-gray-700"
                      title={t('logout')}
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PageHeader; 