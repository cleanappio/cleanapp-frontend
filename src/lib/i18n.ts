import { useRouter } from 'next/router';

// Translation keys and their English values
export const translations: {
  en: { [K in string]: string };
  me: Partial<typeof translations.en>;
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
    signOut: 'Sign out',
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
    
    // Brand specific
    brandDashboard: 'Brand Dashboard',
    brandReports: 'Brand Reports',
    brandMap: 'Brand Map',
    selectBrand: 'Select Brand',
    allBrands: 'All Brands',
    brandReportsCount: 'Reports Count',
    worldwideReports: 'Worldwide Reports',
    
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
    monthly: 'Monthly',
    annual: 'Annual',
    discount: 'Discount',
    
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
    selectLanguage: 'Select language',
    
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
    openFullMap: 'Open full map',
    mapIntegrationComingSoon: 'Map integration coming soon',
    setUpFirstMonitoringLocation: 'Set up your first monitoring location',
    upgradeToAccessRealtimeMonitoring: 'Upgrade to access real-time monitoring',
    createYourAccount: 'Create your account',
    
    // Brand name
    brand: 'Brand',
    brandName: 'Brand Name',
    brandNamePlaceholder: 'Enter your brand name (optional)',
    brandNameDescription: 'Add your brand name to personalize your experience',
    brandNameAdded: 'Brand name added successfully',
    brandNameError: 'Failed to add brand name',
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
    
    // Additional keys for Montenegro components
    goToLogin: 'Go to Login',
    reportsCount: 'Reports Count',
    meanSeverity: 'Mean Severity',
    meanLitterProbability: 'Mean Litter Probability',
    meanHazardProbability: 'Mean Hazard Probability',
    failedToFetchReport: 'Failed to fetch report',
    noImageAvailable: 'No image available',
    failedToGeneratePDF: 'Failed to generate PDF. Please try again.',
    mustBeLoggedInToViewReportDetails: 'You must be logged in to view report details.',
    noReportSelected: 'No report selected',
    errorLoadingReport: 'Error loading report',
    markAsFixed: 'Mark as fixed',
    exportAsPDF: 'Export as PDF',
    
    // Additional keys for components
    failedToFetchReports: 'Failed to fetch reports',
    highPriority: 'High Priority',
    mediumPriority: 'Medium Priority',
    lowPriority: 'Low Priority',
    litter: 'Litter',
    hazard: 'Hazard',
    general: 'General',
    retry: 'Retry',
    noImage: 'No Image',
    reported: 'Reported',
    unknown: 'Unknown',
    noDescriptionAvailable: 'No description available',
    locations: 'Locations',
    monitoringZone: 'Monitoring Zone',
    active: 'Active',
    reportsToday: 'Reports Today',
    liveMonitoring: 'Live Monitoring',
    coverage: 'Coverage',
    twentyFourSeven: '24/7',
    system: 'System',
    operational: 'Operational',
    totalReports: 'Total Reports',
    litterIssues: 'Litter Issues',
    aiInsights: 'AI Insights',
    premiumFeatures: 'Premium Features',
    predictiveRiskAssessment: 'Predictive Risk Assessment',
    costImpactAnalysis: 'Cost Impact Analysis',
    aiPoweredRecommendations: 'AI-Powered Recommendations',
    selectAReport: 'Select a Report',
    selectAReportFromMapToViewDetailedAnalysis: 'Select a report from the map to view detailed analysis',
    clickOnAReportFromTheMapToSeeDetailedInformation: 'Click on a report from the map to see detailed information',
    reportAnalysis: 'Report Analysis',
    time: 'Time',
    severity: 'Severity',
    summary: 'Summary',
    latestReports: 'Latest Reports',
    noReportsFound: 'No reports found',
    noSummary: 'No summary',
    
    // MontenegroReportOverview specific
    litterProbability: 'Litter Probability',
    hazardProbability: 'Hazard Probability',
    severityLevel: 'Severity Level',
    analysis: 'Analysis',
    latitude: 'Latitude',
    longitude: 'Longitude',
    authenticationRequired: 'Authentication Required',
    
    // GlobeView specific
    installAndroid: 'Install Android',
    installIOS: 'Install iOS',
    cleanAppGPT: 'CleanAppGPT',
    physical: 'PHYSICAL',
    digital: 'DIGITAL',
    gettingLocation: 'Getting location...',
    useMyLocation: 'Use My Location',
  },
  me: {
    // Common
    loading: 'Učitavanje...',
    error: 'Greška',
    success: 'Uspeh',
    cancel: 'Otkaži',
    save: 'Sačuvaj',
    delete: 'Obriši',
    edit: 'Uredi',
    submit: 'Pošalji',
    back: 'Nazad',
    next: 'Sledeći',
    previous: 'Prethodni',
    close: 'Zatvori',
    open: 'Otvori',
    search: 'Pretraga',
    filter: 'Filter',
    sort: 'Sortiraj',
    refresh: 'Osveži',
    download: 'Preuzmi',
    upload: 'Otpremi',
    view: 'Pogledaj',
    add: 'Dodaj',
    remove: 'Ukloni',
    confirm: 'Potvrdi',
    yes: 'Da',
    no: 'Ne',
    ok: 'U redu',
    
    // Navigation
    home: 'Početna',
    dashboard: 'Kontrolna tabla',
    reports: 'Izveštaji',
    settings: 'Podešavanja',
    profile: 'Profil',
    logout: 'Odjavi se',
    login: 'Prijavi se',
    signup: 'Registruj se',
    pricing: 'Cenovnik',
    billing: 'Naplata',
    privacy: 'Privatnost',
    
    // Auth
    signIn: 'Prijavi se',
    signInToAccount: 'Prijavite se na svoj račun',
    signUp: 'Registruj se',
    createAccount: 'Kreiraj račun',
    getStarted: 'Započni',
    cleanAppLogo: 'CleanApp Logo',
    emailAddress: 'Email adresa',
    password: 'Lozinka',
    confirmPassword: 'Potvrdi lozinku',
    forgotPassword: 'Zaboravili ste lozinku?',
    rememberMe: 'Zapamti me',
    invalidCredentials: 'Nevažeći podaci',
    welcomeBack: 'Dobrodošli nazad!',
    accountCreated: 'Račun uspešno kreiran!',
    emailRequired: 'Email je obavezan',
    passwordRequired: 'Lozinka je obavezna',
    confirmPasswordRequired: 'Molimo potvrdite lozinku',
    passwordsDoNotMatch: 'Lozinke se ne poklapaju',
    invalidEmailAddress: 'Nevažeća email adresa',
    signingIn: 'Prijavljivanje...',
    signingUp: 'Registracija...',
    signOut: 'Odjavi se',
    startFreeTrial: 'započnite besplatnu probu',
    or: 'Ili',
    
    // Forms
    required: 'Ovo polje je obavezno',
    invalidFormat: 'Nevažeći format',
    minLength: 'Mora biti najmanje {min} karaktera',
    maxLength: 'Ne sme biti više od {max} karaktera',
    
    // Dashboard
    overview: 'Pregled',
    recentActivity: 'Nedavna aktivnost',
    quickActions: 'Brze akcije',
    statistics: 'Statistika',
    charts: 'Grafikoni',
    data: 'Podaci',
    
    // Reports
    generateReport: 'Generiši izveštaj',
    exportReport: 'Izvezi izveštaj',
    reportDetails: 'Detalji izveštaja',
    reportDate: 'Datum izveštaja',
    reportStatus: 'Status izveštaja',
    pending: 'Na čekanju',
    completed: 'Završeno',
    failed: 'Neuspešno',
    cleanAppReport: 'CleanApp izveštaj',
    lastUpdated: 'Poslednji put ažurirano',
    
    // Montenegro specific
    montenegro: 'Crna Gora',
    montenegroDashboard: 'Kontrolna tabla Crne Gore',
    montenegroReports: 'Izveštaji Crne Gore',
    montenegroMap: 'Mapa Crne Gore',
    
    // Brand specific
    brandDashboard: 'Kontrolna tabla brenda',
    brandReports: 'Izveštaji brenda',
    brandMap: 'Mapa brenda',
    selectBrand: 'Izaberi brend',
    allBrands: 'Svi brendovi',
    brandReportsCount: 'Broj izveštaja',
    worldwideReports: 'Izveštaji širom sveta',
    
    // CleanApp Pro
    cleanAppPro: 'CleanApp Pro',
    upgradeToPro: 'Nadogradi na Pro',
    proFeatures: 'Pro funkcije',
    enterprise: 'Enterprise',
    lite: 'Lite',
    free: 'Besplatno',
    
    // Billing
    billingInformation: 'Informacije o naplati',
    paymentMethod: 'Način plaćanja',
    subscription: 'Pretplata',
    plan: 'Plan',
    amount: 'Iznos',
    date: 'Datum',
    status: 'Status',
    invoice: 'Faktura',
    checkout: 'Plaćanje',
    monthly: 'Mesečno',
    annual: 'Godišnje',
    discount: 'Popust',
    
    // Footer
    copyright: '© 2024 CleanApp. Sva prava zadržana.',
    termsOfService: 'Uslovi korišćenja',
    privacyPolicy: 'Politika privatnosti',
    contactUs: 'Kontaktirajte nas',
    support: 'Podrška',
    poweredBy: 'Pokreće',
    viewSampleDigitalCleanAppReport: 'Pogledajte primer digitalnog CleanApp izveštaja',
    viewSampleCleanAppProSubscriberDashboard: 'Pogledajte primer CleanAppPro pretplatničke kontrolne table',
    
    // Errors
    somethingWentWrong: 'Nešto je pošlo naopako',
    tryAgain: 'Pokušajte ponovo',
    networkError: 'Greška mreže',
    serverError: 'Greška servera',
    notFound: 'Stranica nije pronađena',
    unauthorized: 'Neovlašćen pristup',
    forbidden: 'Pristup zabranjen',
    
    // Success messages
    savedSuccessfully: 'Uspešno sačuvano',
    updatedSuccessfully: 'Uspešno ažurirano',
    deletedSuccessfully: 'Uspešno obrisano',
    createdSuccessfully: 'Uspešno kreirano',
    
    // Map related
    map: 'Mapa',
    location: 'Lokacija',
    coordinates: 'Koordinate',
    zoomIn: 'Uvećaj',
    zoomOut: 'Umanji',
    fullscreen: 'Pun ekran',
    selectLanguage: 'Izaberi jezik',
    
    // Globe related
    globe: 'Globus',
    worldView: 'Pogled na svet',
    region: 'Regija',
    
    // File related
    file: 'Fajl',
    files: 'Fajlovi',
    uploadFile: 'Otpremi fajl',
    downloadFile: 'Preuzmi fajl',
    fileName: 'Naziv fajla',
    fileSize: 'Veličina fajla',
    fileType: 'Tip fajla',
    lastModified: 'Poslednji put izmenjen',
    civic: 'Gradski',
    unlimited: 'Neograničeno',
    welcomeBackUser: 'Dobrodošli nazad, {name}!',
    freeTierAlert: 'Trenutno ste na besplatnom nivou.',
    upgradeToUnlock: 'Nadogradi da otključaš više funkcija',
    activeLocations: 'Aktivne lokacije',
    reportsThisMonth: 'Izveštaji ovog meseca',
    aiCreditsUsed: 'Korišćeni AI krediti',
    activeAlerts: 'Aktivna upozorenja',
    yourSubscription: 'Vaša pretplata',
    nextBilling: 'Sledeća naplata',
    manageSubscription: 'Upravljaj pretplatom',
    freeTierLimited: 'Na besplatnom ste nivou sa ograničenim funkcijama.',
    upgradeNow: 'Nadogradi sada',
    welcomeToCleanApp: 'Dobrodošli u CleanApp!',
    recently: 'Nedavno',
    subscriptionStarted: 'Pretplata započeta',
    planActivated: 'plan aktiviran',
    openFullMap: 'Otvori punu mapu',
    mapIntegrationComingSoon: 'Integracija mape uskoro',
    setUpFirstMonitoringLocation: 'Podesite svoju prvu lokaciju za praćenje',
    upgradeToAccessRealtimeMonitoring: 'Nadogradi za pristup praćenju u realnom vremenu',
    createYourAccount: 'Kreirajte svoj račun',
    
    // Brand name
    brand: 'Brend',
    brandName: 'Naziv brenda',
    brandNamePlaceholder: 'Unesite naziv vašeg brenda (opciono)',
    brandNameDescription: 'Dodajte naziv brenda da personalizujete svoje iskustvo',
    brandNameAdded: 'Naziv brenda uspešno dodat',
    brandNameError: 'Greška pri dodavanju naziva brenda',
    
    signInToExistingAccount: 'prijavite se na svoj postojeći račun',
    fullName: 'Puno ime',
    nameRequired: 'Ime je obavezno',
    johnDoe: 'Petar Petrović',
    johnEmail: 'petar@primer.com',
    passwordMinLength: 'Lozinka mora biti najmanje 8 karaktera',
    passwordPlaceholder: '••••••••',
    creatingAccount: 'Kreiranje računa...',
    failedToCreateAccount: 'Neuspešno kreiranje računa',
    forIndividualsAndSmallTeams: 'Za pojedince i male timove',
    liveIssueMap: 'Mapa problema u živo (fizički i digitalni)',
    submitUnlimitedReports: 'Pošalji neograničeno izveštaja',
    communityTrends: 'Trendovi zajednice',
    mobileWebAccess: 'Mobilni i web pristup',
    cleanAppLive: 'CleanAppLive',
    forBusinessesAndBrands: 'Za biznise i brendove koji trebaju dublju vidljivost',
    liveDataAlerts: 'Upozorenja podataka u živo (1 lokacija ili brend)',
    aiPoweredInsights: 'AI-pokrenuti uvid (rizik, trendovi, hitnost)',
    incidentHotspotTracking: 'Praćenje incidenata i hot spotova',
    priorityHelp: 'Prioritetna pomoć',
    forOrganizationsManagingMultiple: 'Za organizacije koje upravljaju više lokacija, brendova ili digitalnih platformi',
    allCleanAppLiveFeatures: 'Sve CleanAppLive funkcije',
    advancedRiskHotspotForecasting: 'Napredno predviđanje rizika i hot spotova',
    multiSiteBrandCoverage: 'Pokrivenost više lokacija/brendova (do 5)',
    customDashboards: 'Prilagođene kontrolne table',
    dedicatedAccountManager: 'Posvećeni menadžer računa',
    currentPlan: 'Trenutni plan',
    downgrade: 'Nadogradi',
    contactSales: 'Kontaktiraj prodaju',
    changeNow: 'Promeni sada',
    subscribeNow: 'Pretplati se sada',
    backToMap: 'Nazad na mapu',
    trashIsCash: 'Smeće je novac',
    liveInsightsLowerCosts: 'UŽIVO uvid, niži troškovi održavanja i odgovornosti,',
    muchHigherMargins: 'mnogo veće marže.',
    loggedIn: 'Prijavljeni ste!',
    loginFailed: 'Neuspešna prijava',
    signupFailed: 'Neuspešna registracija',
    cardElementNotFound: 'Element kartice nije pronađen',
    paymentFailed: 'Neuspešno plaćanje',
    paymentMethodCreationFailed: 'Neuspešno kreiranje načina plaćanja',
    subscriptionUpdatedSuccessfully: 'Pretplata uspešno ažurirana!',
    subscriptionCreatedSuccessfully: 'Pretplata uspešno kreirana!',
    failedToCreateSubscription: 'Neuspešno kreiranje pretplate',
    invalidPlanSelected: 'Nevažeći plan izabran',
    loadingPaymentMethods: 'Učitavanje načina plaćanja...',
    signUpOrLogInToContinue: 'Registrujte se ili prijavite da nastavite',
    email: 'Email',
    checking: 'Proveravanje...',
    loggingIn: 'Prijavljivanje...',
    subscriptionSummary: 'Pregled pretplate',
    billingCycle: 'Ciklus naplate',
    total: 'Ukupno',
    paymentInformation: 'Informacije o plaćanju',
    pleaseCompleteAuthenticationToContinueWithCheckout: 'Molimo završite autentifikaciju da nastavite sa plaćanjem',
    selectPaymentMethod: 'Izaberite način plaćanja',
    expires: 'Ističe',
    default: 'Podrazumevano',
    addNewPaymentMethod: 'Dodaj novi način plaćanja',
    add_new_payment_method: 'Dodaj novi način plaćanja',
    cardholderName: 'Ime nosioca kartice',
    cardholder_name: 'Ime nosioca kartice',
    cardInformation: 'Informacije o kartici',
    card_information: 'Informacije o kartici',
    billing_address: 'Adresa za naplatu',
    address_line_1: 'Adresa linija 1',
    address_line_2_optional: 'Adresa linija 2 (Opciono)',
    apartment_suite_etc: 'Stan, apartman, itd.',
    city: 'Grad',
    state_province: 'Država/Pokrajina',
    postal_code: 'Poštanski broj',
    setAsDefaultPaymentMethod: 'Postavi kao podrazumevani način plaćanja',
    adding: 'Dodavanje...',
    add_payment_method: 'Dodaj način plaćanja',
    confirm_cancel_subscription: 'Da li ste sigurni da želite da otkažete pretplatu? Ova akcija se ne može poništiti.',
    subscription_canceled_successfully: 'Pretplata uspešno otkazana',
    failed_to_cancel_subscription: 'Neuspešno otkazivanje pretplate',
    confirm_remove_payment_method: 'Da li ste sigurni da želite da uklonite ovaj način plaćanja?',
    payment_method_removed: 'Način plaćanja uklonjen',
    failed_to_remove_payment_method: 'Neuspešno uklanjanje načina plaćanja',
    default_payment_method_updated: 'Podrazumevani način plaćanja ažuriran',
    failed_to_update_default_payment_method: 'Neuspešno ažuriranje podrazumevanog načina plaćanja',
    invoice_downloaded_successfully: 'Faktura uspešno preuzeta',
    failed_to_download_invoice: 'Neuspešno preuzimanje fakture',
    billing_subscription: 'Naplata i pretplata',
    current_subscription: 'Trenutna pretplata',
    billing_cycle: 'Ciklus naplate',
    next_billing_date: 'Sledeći datum naplate',
    change_plan: 'Promeni plan',
    cancelling: 'Otkazivanje...',
    cancel_subscription: 'Otkaži pretplatu',
    no_active_subscription: 'Nemate aktivnu pretplatu.',
    view_plans: 'Pogledaj planove',
    payment_methods: 'Načini plaćanja',
    add_new: 'Dodaj novo',
    set_as_default: 'Postavi kao podrazumevano',
    no_payment_methods: 'Nema načina plaćanja u evidenciji.',
    billing_history: 'Istorija naplate',
    download_invoice: 'Preuzmi fakturu',
    no_billing_history: 'Nema dostupne istorije naplate.',
    processing: 'Obrađivanje...',
    subscribe: 'Pretplati se',
    yourPaymentInformationIsEncryptedAndSecure: 'Vaši podaci o plaćanju su šifrovani i sigurni. Možete otkazati pretplatu u bilo kom trenutku.',
    authenticationComplete: 'Autentifikacija završena',
    readyToCheckout: 'Spremno za plaćanje',
    noPlanSelected: 'Nije izabran plan',
    backToPricing: 'Nazad na cenovnik',
    completeYourSubscription: 'Završite pretplatu',
    privacyPolicyTitle: 'Politika privatnosti (13. jun 2023)',
    privacyPolicyIntro: 'Ova Politika privatnosti opisuje kako naša kompanija prikuplja, koristi i deli vaše lične informacije kada posetite našu web stranicu ili koristite naše usluge. Posvećeni smo zaštiti vaše privatnosti i osiguravanju sigurnosti vaših ličnih informacija. Korišćenjem naše aplikacije, pristajete na prakse opisane u ovoj Politici privatnosti.',
    informationWeCollect: 'Informacije koje prikupljamo',
    privacyPolicyPersonalInformation: '1.1 Lične informacije: Možemo prikupiti lične informacije kao što su vaše avatar ime i blockchain adresa kada se registrujete u našoj aplikaciji. Vaše avatar ime i blockchain adresa se sigurno čuvaju na vašem uređaju i šalju se u vašim izveštajima za obradu nagrada.',
    privacyPolicyUsageData: '1.2 Podaci o korišćenju: Naša aplikacija prikuplja informacije o vašoj lokaciji kada koristite aplikaciju, npr. napravite izveštaj o smeću ili opasnosti.',
    useOfInformation: 'Korišćenje informacija',
    privacyPolicyUseOfPersonalInformation: '2.1 Lične informacije: Koristimo vašu blockchain adresu za obradu nagrada u igri. Šaljemo poene koje ste osvojili na vašu blockchain adresu jednom dnevno. Nakon toga uklanjamo vaš avatar i blockchain adresu iz vaših izveštaja i vaši izveštaji postaju anonimni. Ako pristanete da objavite izveštaje sa vašim avatarom, zadržaćemo vaš avatar povezan sa izveštajima.',
    privacyPolicyUseOfUsageData: '2.2 Podaci o korišćenju: Koristimo anonimizirane podatke o lokaciji za agregiranje podataka izveštaja po određenim lokacijama i slanje upozorenja remedijatorima za preduzimanje akcije na vašim izveštajima.',
    informationSharing: 'Deljenje informacija',
    privacyPolicyDataPublishing: '3.1 Objava podataka: Možemo objaviti vaše izveštaje sa vašim avatarom samo ako pristanete. U suprotnom, svi izveštaji se objavljuju anonimno.',
    privacyPolicyThirdPartyProviders: '3.2 Pružaoci usluga treće strane: Možemo deliti vaše lične informacije sa pouzdanim pružaocima usluga treće strane koji nam pomažu u radu naše web stranice, vođenju našeg poslovanja ili pružanju usluga vama. Ovi pružaoci usluga imaju pristup vašim ličnim informacijama samo za izvršavanje zadataka u naše ime i obavezani su da ih ne otkrivaju ili koriste u bilo koje druge svrhe.',
    privacyPolicyLegalCompliance: '3.3 Pravna usklađenost: Možemo otkriti vaše lične informacije ako to zahteva zakon ili kao odgovor na važeće zahteve javnih organa (npr. sud ili državna agencija).',
    dataSecurity: 'Sigurnost podataka',
    privacyPolicyDataSecurity: 'Implementiramo razumne sigurnosne mere za zaštitu vaših ličnih informacija od neovlašćenog pristupa, otkrivanja, izmene ili uništavanja. Međutim, imajte na umu da nijedan metod prenosa preko interneta ili elektronskog skladištenja nije 100% siguran i ne možemo garantirati apsolutnu sigurnost.',
    yourChoices: 'Vaši izbori',
    privacyPolicyYourChoices: 'Imate pravo da pristupite, ispravite ili obrišete svoje lične informacije. Takođe možete izabrati da se odjavite iz naših marketinških komunikacija ili prilagodite svoje preferencije kontaktiranjem nas na privacy@cleanapp.io.',
    updatesToPrivacyPolicy: 'Ažuriranja ove Politike privatnosti',
    privacyPolicyUpdates: 'Možemo ažurirati ovu Politiku privatnosti s vremena na vreme da odražavamo promene u našim praksama ili primenjivim zakonima. Obavestićemo vas o bilo kojim značajnim promenama objavljivanjem ažurirane Politike privatnosti na našoj web stranici ili drugim sredstvima komunikacije.',
    privacyPolicyContactUs: 'Ako imate bilo kakva pitanja, brige ili zahteve u vezi sa ovom Politikom privatnosti ili rukovanjem vašim ličnim informacijama, molimo kontaktirajte nas na privacy@cleanapp.io.',
    
    // Additional keys for Montenegro components
    goToLogin: 'Idi na prijavu',
    reportsCount: 'Broj izveštaja',
    meanSeverity: 'Srednja ozbiljnost',
    meanLitterProbability: 'Srednja verovatnoća smeća',
    meanHazardProbability: 'Srednja verovatnoća opasnosti',
    failedToFetchReport: 'Neuspešno preuzimanje izveštaja',
    noImageAvailable: 'Nema dostupne slike',
    failedToGeneratePDF: 'Neuspešno generisanje PDF-a. Molimo pokušajte ponovo.',
    mustBeLoggedInToViewReportDetails: 'Morate biti prijavljeni da vidite detalje izveštaja.',
    noReportSelected: 'Nije izabran izveštaj',
    errorLoadingReport: 'Greška učitavanja izveštaja',
    markAsFixed: 'Označi kao popravljeno',
    exportAsPDF: 'Izvezi kao PDF',
    
    // Additional keys for components
    failedToFetchReports: 'Neuspešno preuzimanje izveštaja',
    highPriority: 'Visok prioritet',
    mediumPriority: 'Srednji prioritet',
    lowPriority: 'Nizak prioritet',
    litter: 'Smeće',
    hazard: 'Opasnost',
    general: 'Opšte',
    retry: 'Pokušaj ponovo',
    noImage: 'Nema slike',
    reported: 'Prijavljeno',
    unknown: 'Nepoznato',
    noDescriptionAvailable: 'Nema dostupnog opisa',
    locations: 'Lokacije',
    monitoringZone: 'Zona praćenja',
    active: 'Aktivno',
    reportsToday: 'Izveštaji danas',
    liveMonitoring: 'Praćenje u živo',
    coverage: 'Pokrivenost',
    twentyFourSeven: '24/7',
    system: 'Sistem',
    operational: 'Operativno',
    totalReports: 'Ukupno izveštaja',
    litterIssues: 'Problemi sa smećem',
    aiInsights: 'AI uvid',
    premiumFeatures: 'Premium funkcije',
    predictiveRiskAssessment: 'Prediktivna procena rizika',
    costImpactAnalysis: 'Analiza uticaja troškova',
    aiPoweredRecommendations: 'AI-pokrenute preporuke',
    selectAReport: 'Izaberite izveštaj',
    selectAReportFromMapToViewDetailedAnalysis: 'Izaberite izveštaj sa mape da vidite detaljnu analizu',
    clickOnAReportFromTheMapToSeeDetailedInformation: 'Kliknite na izveštaj sa mape da vidite detaljne informacije',
    reportAnalysis: 'Analiza izveštaja',
    time: 'Vreme',
    severity: 'Ozbiljnost',
    summary: 'Sažetak',
    latestReports: 'Najnoviji izveštaji',
    noReportsFound: 'Nema pronađenih izveštaja',
    noSummary: 'Nema sažetka',
    
    // MontenegroReportOverview specific
    litterProbability: 'Verovatnoća smeća',
    hazardProbability: 'Verovatnoća opasnosti',
    severityLevel: 'Nivo ozbiljnosti',
    analysis: 'Analiza',
    latitude: 'Geografska širina',
    longitude: 'Geografska dužina',
    authenticationRequired: 'Potrebna je autentifikacija',
    
    // GlobeView specific
    installAndroid: 'Instaliraj Android',
    installIOS: 'Instaliraj iOS',
    cleanAppGPT: 'CleanAppGPT',
    physical: 'FIZIČKI',
    digital: 'DIGITALNI',
    gettingLocation: 'Dobijanje lokacije...',
    useMyLocation: 'Koristi moju lokaciju',
  },
};

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

// Hook to use translations
export function useTranslations() {
  const router = useRouter();
  const locale = (router.locale as Locale) || (router.defaultLocale as Locale) || 'en';
  
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    // Always fallback to English if the locale is not supported or translation is missing
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

// Utility function to get current locale for API calls
export function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    // Client-side: get from router or URL
    const pathname = window.location.pathname;
    const localeMatch = pathname.match(/^\/(en|me)/);
    return localeMatch ? localeMatch[1] : 'en';
  }
  // Server-side: default to English
  return 'en';
}

// Function to filter analyses by language and convert to LatestReport format
export function filterAnalysesByLanguage(
  reportsWithAnalyses: any[],
  currentLocale: string = 'en'
): any[] {
  // Handle edge cases where input is not an array
  if (!Array.isArray(reportsWithAnalyses)) {
    console.warn('filterAnalysesByLanguage: Input is not an array:', reportsWithAnalyses);
    return [];
  }

  return reportsWithAnalyses.map(reportWithAnalysis => {
    // Handle edge cases where reportWithAnalysis is null/undefined
    if (!reportWithAnalysis || typeof reportWithAnalysis !== 'object') {
      console.warn('filterAnalysesByLanguage: Invalid reportWithAnalysis:', reportWithAnalysis);
      return null;
    }

    // Ensure analysis is an array
    const analyses = Array.isArray(reportWithAnalysis.analysis) 
      ? reportWithAnalysis.analysis 
      : [];

    // Filter analyses by current language
    const filteredAnalyses = analyses.filter((analysis: any) => 
      analysis && analysis.language && analysis.language.toLowerCase() === currentLocale.toLowerCase()
    );
    
    // If no analysis found for current language, try to find English as fallback
    if (filteredAnalyses.length === 0) {
      const englishAnalyses = analyses.filter((analysis: any) => 
        analysis && analysis.language && analysis.language.toLowerCase() === 'en'
      );
      
      if (englishAnalyses.length > 0) {
        // Return the first English analysis
        return {
          report: reportWithAnalysis.report,
          analysis: englishAnalyses[0]
        };
      }
    }
    
    // Return the first analysis in the current language
    if (filteredAnalyses.length > 0) {
      return {
        report: reportWithAnalysis.report,
        analysis: filteredAnalyses[0]
      };
    }
    
    // If no analysis found at all, return null (will be filtered out)
    return null;
  }).filter(Boolean); // Remove null entries
} 