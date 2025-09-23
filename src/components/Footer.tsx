import React from "react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n";

const Footer = () => {
  const { t } = useTranslations();

  return (
    <footer className="bg-white py-8 rounded-b-2xl shadow-sm border-t border-gray-200 flex items-center">
      <div className="max-w-7xl mx-auto px-4 my-auto">
        <div className="text-center text-sm text-gray-500">
          {t("poweredBy")}{" "}
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
        </div>
      </div>
    </footer>
  );
};

export default Footer;
