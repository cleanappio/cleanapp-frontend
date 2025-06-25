import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { LogOut } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex items-center">
                <Image 
                  src="/cleanapp-logo.png" 
                  alt="CleanApp Logo" 
                  width={200} 
                  height={60}
                  className="h-12 w-auto"
                  priority
                />
              </Link>
              
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/pricing"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Pricing
                </Link>
                {isAuthenticated && (
                  <>
                    <Link
                      href="/dashboard"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/billing"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Billing
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">{user?.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-gray-700"
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
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <main>{children}</main>
    </div>
  );
}
