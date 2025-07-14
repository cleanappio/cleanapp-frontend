import React from "react";
import Link from "next/link";
import { useTranslations } from '@/lib/i18n';

const Footer = () => {
  const { t } = useTranslations();
  
  return (
    <footer className="bg-white pt-8 pb-4 rounded-b-2xl shadow-sm mt-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center text-sm text-gray-500">
          {t('poweredBy')}{" "}
          <Link href={"https://www.stxn.io/"}>
            <span className=" text-green-700 hover:text-green-500">
              Smart Transactions (STXN)
            </span>
          </Link>{" "}
          &amp;{" "}
          <Link href={"https://www.cleanapp.io/"}>
            <span className=" text-green-700 hover:text-green-500">
              CleanApp
            </span>
          </Link>
          <br />
          <Link href={"https://cleanapppro.replit.app/google"}>
            <span className="text-green-700 hover:text-green-500">
              {t('viewSampleDigitalCleanAppReport')}
            </span>
          </Link>
          <span className="mx-2 text-gray-300">•</span>
          <Link href={"https://cleanapppro.replit.app/subscribed-sample"}>
            <span className="text-green-700 hover:text-green-500">
              {t('viewSampleCleanAppProSubscriberDashboard')}
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
