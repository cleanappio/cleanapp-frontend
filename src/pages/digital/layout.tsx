import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50">
      <PageHeader />
      {children}
      <Footer />
    </div>
  );
}
