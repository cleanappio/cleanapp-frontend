import React from "react";
import { useTranslations } from '@/lib/i18n';

const Privacy = () => {
  const { t } = useTranslations();
  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-4 md:gap-8">
      <h4 className="text-2xl font-bold">{t('privacyPolicyTitle')}</h4>
      <p>{t('privacyPolicyIntro')}</p>
      <h5 className="text-xl font-bold">{t('informationWeCollect')}</h5>
      <p>{t('privacyPolicyPersonalInformation')}</p>
      <p>{t('privacyPolicyUsageData')}</p>
      <h5 className="text-xl font-bold">{t('useOfInformation')}</h5>
      <p>{t('privacyPolicyUseOfPersonalInformation')}</p>
      <p>{t('privacyPolicyUseOfUsageData')}</p>
      <h5 className="text-xl font-bold">{t('informationSharing')}</h5>
      <p>{t('privacyPolicyDataPublishing')}</p>
      <p>{t('privacyPolicyThirdPartyProviders')}</p>
      <p>{t('privacyPolicyLegalCompliance')}</p>
      <h5 className="text-xl font-bold">{t('dataSecurity')}</h5>
      <p>{t('privacyPolicyDataSecurity')}</p>
      <h5 className="text-xl font-bold">{t('yourChoices')}</h5>
      <p>{t('privacyPolicyYourChoices')}</p>
      <h5 className="text-xl font-bold">{t('updatesToPrivacyPolicy')}</h5>
      <p>{t('privacyPolicyUpdates')}</p>
      <h5 className="text-xl font-bold">{t('contactUs')}</h5>
      <p>{t('privacyPolicyContactUs')}</p>
    </div>
  );
};

export default Privacy;
