import React from "react";
import { useTranslations } from "@/lib/i18n";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";

const Privacy = () => {
  const { t } = useTranslations();

  const sections: { heading: string; paragraphs: string[] }[] = [
    { heading: t("informationWeCollect"), paragraphs: [t("privacyPolicyPersonalInformation"), t("privacyPolicyUsageData")] },
    { heading: t("useOfInformation"), paragraphs: [t("privacyPolicyUseOfPersonalInformation"), t("privacyPolicyUseOfUsageData")] },
    { heading: t("informationSharing"), paragraphs: [t("privacyPolicyDataPublishing"), t("privacyPolicyThirdPartyProviders"), t("privacyPolicyLegalCompliance")] },
    { heading: t("dataSecurity"), paragraphs: [t("privacyPolicyDataSecurity")] },
    { heading: t("yourChoices"), paragraphs: [t("privacyPolicyYourChoices")] },
    { heading: t("updatesToPrivacyPolicy"), paragraphs: [t("privacyPolicyUpdates")] },
    { heading: t("contactUs"), paragraphs: [t("privacyPolicyContactUs")] },
  ];

  return (
    <>
      <Seo
        title="CleanApp Privacy Policy"
        description="How CleanApp collects, uses and shares data from incident, hazard and bug reports, and the choices reporters and organizations have."
        path="/privacy"
      />
      <div className="min-h-screen bg-white">
        <PageHeader />
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Legal</p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">{t("privacyPolicyTitle")}</h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">{t("privacyPolicyIntro")}</p>
          {sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-xl font-bold text-gray-900">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
        <Footer />
      </div>
    </>
  );
};

export default Privacy;
