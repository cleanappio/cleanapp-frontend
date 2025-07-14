import { useRouter } from 'next/router';

// Translation keys and their English values
export const translations: {
  en: { [K in string]: string };
  es: Partial<typeof translations.en>;
  fr: Partial<typeof translations.en>;
  de: Partial<typeof translations.en>;
} = {
  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    open: 'Open',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    download: 'Download',
    upload: 'Upload',
    view: 'View',
    add: 'Add',
    remove: 'Remove',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    
    // Navigation
    home: 'Home',
    dashboard: 'Dashboard',
    reports: 'Reports',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Login',
    signup: 'Sign Up',
    pricing: 'Pricing',
    billing: 'Billing',
    privacy: 'Privacy',
    
    // Auth
    signIn: 'Sign in',
    signInToAccount: 'Sign in to your account',
    signUp: 'Sign up',
    createAccount: 'Create account',
    getStarted: 'Get started',
    cleanAppLogo: 'CleanApp Logo',
    emailAddress: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    invalidCredentials: 'Invalid credentials',
    welcomeBack: 'Welcome back!',
    accountCreated: 'Account created successfully!',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    confirmPasswordRequired: 'Please confirm your password',
    passwordsDoNotMatch: 'Passwords do not match',
    invalidEmailAddress: 'Invalid email address',
    signingIn: 'Signing in...',
    signingUp: 'Signing up...',
    startFreeTrial: 'start your free trial',
    or: 'Or',
    
    // Forms
    required: 'This field is required',
    invalidFormat: 'Invalid format',
    minLength: 'Must be at least {min} characters',
    maxLength: 'Must be no more than {max} characters',
    
    // Dashboard
    overview: 'Overview',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    statistics: 'Statistics',
    charts: 'Charts',
    data: 'Data',
    
    // Reports
    generateReport: 'Generate Report',
    exportReport: 'Export Report',
    reportDetails: 'Report Details',
    reportDate: 'Report Date',
    reportStatus: 'Report Status',
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
    cleanAppReport: 'CleanApp Report',
    lastUpdated: 'Last updated',
    
    // Montenegro specific
    montenegro: 'Montenegro',
    montenegroDashboard: 'Montenegro Dashboard',
    montenegroReports: 'Montenegro Reports',
    montenegroMap: 'Montenegro Map',
    
    // CleanApp Pro
    cleanAppPro: 'CleanApp Pro',
    upgradeToPro: 'Upgrade to Pro',
    proFeatures: 'Pro Features',
    enterprise: 'Enterprise',
    lite: 'Lite',
    free: 'Free',
    
    // Billing
    billingInformation: 'Billing Information',
    paymentMethod: 'Payment Method',
    subscription: 'Subscription',
    plan: 'Plan',
    amount: 'Amount',
    date: 'Date',
    status: 'Status',
    invoice: 'Invoice',
    checkout: 'Checkout',
    
    // Footer
    copyright: '© 2024 CleanApp. All rights reserved.',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    contactUs: 'Contact Us',
    support: 'Support',
    poweredBy: 'Powered by',
    viewSampleDigitalCleanAppReport: 'View sample Digital CleanApp Report',
    viewSampleCleanAppProSubscriberDashboard: 'View sample CleanAppPro subscriber dashboard',
    
    // Errors
    somethingWentWrong: 'Something went wrong',
    tryAgain: 'Please try again',
    networkError: 'Network error',
    serverError: 'Server error',
    notFound: 'Page not found',
    unauthorized: 'Unauthorized access',
    forbidden: 'Access forbidden',
    
    // Success messages
    savedSuccessfully: 'Saved successfully',
    updatedSuccessfully: 'Updated successfully',
    deletedSuccessfully: 'Deleted successfully',
    createdSuccessfully: 'Created successfully',
    
    // Map related
    map: 'Map',
    location: 'Location',
    coordinates: 'Coordinates',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fullscreen: 'Fullscreen',
    
    // Globe related
    globe: 'Globe',
    worldView: 'World View',
    region: 'Region',
    
    // File related
    file: 'File',
    files: 'Files',
    uploadFile: 'Upload File',
    downloadFile: 'Download File',
    fileName: 'File Name',
    fileSize: 'File Size',
    fileType: 'File Type',
    lastModified: 'Last Modified',
    civic: 'Civic',
    unlimited: 'Unlimited',
    welcomeBackUser: 'Welcome back, {name}!',
    freeTierAlert: 'You\'re currently on the free tier.',
    upgradeToUnlock: 'Upgrade to unlock more features',
    activeLocations: 'Active Locations',
    reportsThisMonth: 'Reports This Month',
    aiCreditsUsed: 'AI Credits Used',
    activeAlerts: 'Active Alerts',
    yourSubscription: 'Your Subscription',
    nextBilling: 'Next billing',
    manageSubscription: 'Manage subscription',
    freeTierLimited: 'You\'re on the free tier with limited features.',
    upgradeNow: 'Upgrade Now',
    welcomeToCleanApp: 'Welcome to CleanApp!',
    recently: 'Recently',
    subscriptionStarted: 'Subscription started',
    planActivated: 'plan activated',
    cleanAppMap: 'CleanApp Map',
    openFullMap: 'Open full map',
    mapIntegrationComingSoon: 'Map integration coming soon',
    setUpFirstMonitoringLocation: 'Set up your first monitoring location',
    upgradeToAccessRealtimeMonitoring: 'Upgrade to access real-time monitoring',
    createYourAccount: 'Create your account',
    signInToExistingAccount: 'sign in to your existing account',
    fullName: 'Full Name',
    nameRequired: 'Name is required',
    johnDoe: 'John Doe',
    johnEmail: 'john@example.com',
    passwordMinLength: 'Password must be at least 8 characters',
    passwordPlaceholder: '••••••••',
    creatingAccount: 'Creating account...',
    failedToCreateAccount: 'Failed to create account',
    forIndividualsAndSmallTeams: 'For individuals & small teams',
    liveIssueMap: 'Live issue map (physical & digital)',
    submitUnlimitedReports: 'Submit unlimited reports',
    communityTrends: 'Community trends',
    mobileWebAccess: 'Mobile & web access',
    cleanAppLive: 'CleanAppLive',
    forBusinessesAndBrands: 'For businesses & brands that need deeper visibility',
    liveDataAlerts: 'Live data alerts (1 site or brand)',
    aiPoweredInsights: 'AI-powered insights (risk, trends, urgency)',
    incidentHotspotTracking: 'Incident & hotspot tracking',
    priorityHelp: 'Priority help',
    forOrganizationsManagingMultiple: 'For organizations managing multiple sites, brands, or digital platforms',
    allCleanAppLiveFeatures: 'All CleanAppLive features',
    advancedRiskHotspotForecasting: 'Advanced risk & hotspot forecasting',
    multiSiteBrandCoverage: 'Multi-site/brand coverage (up to 5)',
    customDashboards: 'Custom dashboards',
    dedicatedAccountManager: 'Dedicated account manager',
    currentPlan: 'Current Plan',
    downgrade: 'Downgrade',
    contactSales: 'Contact Sales',
    changeNow: 'Change now',
    subscribeNow: 'Subscribe Now',
    backToMap: 'Back to Map',
    trashIsCash: 'Trash is Cash',
    liveInsightsLowerCosts: 'LIVE insights, lower maintenance & liability costs,',
    muchHigherMargins: 'much higher margins.',
    loggedIn: 'Logged in!',
    loginFailed: 'Login failed',
    signupFailed: 'Signup failed',
    cardElementNotFound: 'Card element not found',
    paymentFailed: 'Payment failed',
    paymentMethodCreationFailed: 'Payment method creation failed',
    subscriptionUpdatedSuccessfully: 'Subscription updated successfully!',
    subscriptionCreatedSuccessfully: 'Subscription created successfully!',
    failedToCreateSubscription: 'Failed to create subscription',
    invalidPlanSelected: 'Invalid plan selected',
    loadingPaymentMethods: 'Loading payment methods...',
    signUpOrLogInToContinue: 'Sign up or Log in to Continue',
    email: 'Email',
    checking: 'Checking...',
    loggingIn: 'Logging in...',
    subscriptionSummary: 'Subscription Summary',
    billingCycle: 'Billing Cycle',
    total: 'Total',
    paymentInformation: 'Payment Information',
    pleaseCompleteAuthenticationToContinueWithCheckout: 'Please complete authentication to continue with checkout',
    selectPaymentMethod: 'Select Payment Method',
    expires: 'Expires',
    default: 'Default',
    addNewPaymentMethod: 'Add New Payment Method',
    add_new_payment_method: 'Add New Payment Method',
    cardholderName: 'Cardholder Name',
    cardholder_name: 'Cardholder Name',
    cardInformation: 'Card Information',
    card_information: 'Card Information',
    billing_address: 'Billing Address',
    address_line_1: 'Address Line 1',
    address_line_2_optional: 'Address Line 2 (Optional)',
    apartment_suite_etc: 'Apartment, suite, etc.',
    city: 'City',
    state_province: 'State/Province',
    postal_code: 'Postal Code',
    setAsDefaultPaymentMethod: 'Set as default payment method',
    adding: 'Adding...',
    add_payment_method: 'Add Payment Method',
    confirm_cancel_subscription: 'Are you sure you want to cancel your subscription? This action cannot be undone.',
    subscription_canceled_successfully: 'Subscription canceled successfully',
    failed_to_cancel_subscription: 'Failed to cancel subscription',
    confirm_remove_payment_method: 'Are you sure you want to remove this payment method?',
    payment_method_removed: 'Payment method removed',
    failed_to_remove_payment_method: 'Failed to remove payment method',
    default_payment_method_updated: 'Default payment method updated',
    failed_to_update_default_payment_method: 'Failed to update default payment method',
    invoice_downloaded_successfully: 'Invoice downloaded successfully',
    failed_to_download_invoice: 'Failed to download invoice',
    billing_subscription: 'Billing & Subscription',
    current_subscription: 'Current Subscription',
    billing_cycle: 'Billing Cycle',
    next_billing_date: 'Next Billing Date',
    change_plan: 'Change Plan',
    cancelling: 'Cancelling...',
    cancel_subscription: 'Cancel Subscription',
    no_active_subscription: 'You don\'t have an active subscription.',
    view_plans: 'View Plans',
    payment_methods: 'Payment Methods',
    add_new: 'Add New',
    set_as_default: 'Set as default',
    no_payment_methods: 'No payment methods on file.',
    billing_history: 'Billing History',
    download_invoice: 'Download Invoice',
    no_billing_history: 'No billing history available.',
    processing: 'Processing...',
    subscribe: 'Subscribe',
    yourPaymentInformationIsEncryptedAndSecure: 'Your payment information is encrypted and secure. You can cancel your subscription at any time.',
    authenticationComplete: 'Authentication Complete',
    readyToCheckout: 'Ready to checkout',
    noPlanSelected: 'No plan selected',
    backToPricing: 'Back to pricing',
    completeYourSubscription: 'Complete Your Subscription',
    privacyPolicyTitle: 'Privacy Policy (June 13, 2023)',
    privacyPolicyIntro: 'This Privacy Policy describes how our company collects, uses, and shares your personal information when you visit our website or use our services. We are committed to protecting your privacy and ensuring the security of your personal information. By using our application, you consent to the practices described in this Privacy Policy.',
    informationWeCollect: 'Information We Collect',
    privacyPolicyPersonalInformation: '1.1 Personal Information: We may collect personal information such as your avatar name and a blockchain address when you register in our app. Your avatar name and a blockchain address are securely stored on your device and are sent within your reports to process rewards.',
    privacyPolicyUsageData: '1.2 Usage Data: Our app collects information about your location when you use the application, i.e. take a litter or hazard report.',
    useOfInformation: 'Use of Information',
    privacyPolicyUseOfPersonalInformation: '2.1 Personal Information: We use your blockchain address to process game rewards. We send points you won to your blockchain address once a day. After that we remove your avatar and blockchain address from your reports and your reports become anonymized. If you consent to publish reports with your avatar, we will keep your avatar connected to reports.',
    privacyPolicyUseOfUsageData: '2.2 Usage Data: We use anonymized location data to aggregate report data by certain locations and send alerts to remediators for taking action on your reports.',
    informationSharing: 'Information Sharing',
    privacyPolicyDataPublishing: '3.1 Data Publishing: We may publish your reports with your avatar only if you consent. Otherwise all reports are published anonymously.',
    privacyPolicyThirdPartyProviders: '3.2 Third-Party Service Providers: We may share your personal information with trusted third-party service providers who assist us in operating our website, conducting our business, or providing services to you. These service providers have access to your personal information only to perform tasks on our behalf and are obligated not to disclose or use it for any other purpose.',
    privacyPolicyLegalCompliance: '3.3 Legal Compliance: We may disclose your personal information if required by law or in response to valid requests by public authorities (e.g., a court or government agency).',
    dataSecurity: 'Data Security',
    privacyPolicyDataSecurity: 'We implement reasonable security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, please note that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.',
    yourChoices: 'Your Choices',
    privacyPolicyYourChoices: 'You have the right to access, correct, or delete your personal information. You can also choose to unsubscribe from our marketing communications or adjust your preferences by contacting us at privacy@cleanapp.io.',
    updatesToPrivacyPolicy: 'Updates to this Privacy Policy',
    privacyPolicyUpdates: 'We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any significant changes by posting the updated Privacy Policy on our website or by other means of communication.',
    privacyPolicyContactUs: 'If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your personal information, please contact us at privacy@cleanapp.io.',
  },
  // Add other languages here as needed
  es: {
    // Spanish translations would go here
  },
  fr: {
    // French translations would go here
  },
  de: {
    // German translations would go here
  },
};

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

// Hook to use translations
export function useTranslations() {
  const router = useRouter();
  const locale = (router.locale as Locale) || 'en';
  
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const translation = translations[locale]?.[key] || translations.en[key] || key;
    
    if (params) {
      return Object.entries(params).reduce((str, [param, value]) => {
        return str.replace(new RegExp(`{${param}}`, 'g'), String(value));
      }, translation);
    }
    
    return translation;
  };
  
  return { t, locale };
}

// Utility function to get translation without hook
export function getTranslation(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  const translation = translations[locale]?.[key] || translations.en[key] || key;
  
  if (params) {
    return Object.entries(params).reduce((str, [param, value]) => {
      return str.replace(new RegExp(`{${param}}`, 'g'), String(value));
    }, translation);
  }
  
  return translation;
} 