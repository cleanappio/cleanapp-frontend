import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/lib/auth-store";
import Layout from "@/components/Layout";
import Seo from "@/components/Seo";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function App({ Component, pageProps }: AppProps) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      {/* Site-wide defaults; any page rendering its own <Seo /> overrides these. */}
      <Seo />
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
}
