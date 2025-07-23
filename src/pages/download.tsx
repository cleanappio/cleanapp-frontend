import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import { Apple, Play } from 'lucide-react';

const ANDROID_URL = process.env.NEXT_PUBLIC_PLAYSTORE_URL || 'https://play.google.com/store/apps/details?id=com.cleanapp';
const IOS_URL = process.env.NEXT_PUBLIC_APPSTORE_URL || 'https://apps.apple.com/us/app/cleanapp/id6466403301';
const REF_API_URL = process.env.NEXT_PUBLIC_REF_API_URL || 'http://dev.api.cleanapp.io:8080/write_referral';

export default function DownloadPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [os, setOs] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [clientInfo, setClientInfo] = useState({
    ipAddress: '',
    screenWidth: 0,
    screenHeight: 0
  });

  // Get refid parameter from URL
  const { refid } = router.query;
  const refId = typeof refid === 'string' ? refid : undefined;

  // Function to get client IP address
  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching IP address:', error);
      return '';
    }
  };

  // Function to get screen dimensions
  const getScreenDimensions = () => {
    return {
      width: window.screen.width,
      height: window.screen.height
    };
  };

  // Function to get viewport dimensions
  const getViewportDimensions = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  };

  useEffect(() => {
    const detectOS = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // Android detection
      if (/android/i.test(userAgent)) {
        return 'android';
      }
      
      // iOS detection
      if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        return 'ios';
      }
      
      return null;
    };

    const detectClientInfo = async () => {
      // Get IP address
      const ipAddress = await getClientIP();
      
      // Get screen dimensions
      const screenDimensions = getScreenDimensions();
      const viewportDimensions = getViewportDimensions();
      
      const newClientInfo = {
        ipAddress,
        screenWidth: screenDimensions.width,
        screenHeight: screenDimensions.height
      };

      // Log client information
      console.log('Client Information:', {
        ipAddress,
        screenDimensions,
        viewportDimensions,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      });

      return newClientInfo;
    };

    const sendReferralData = async (clientInfo: any) => {
      if (!refId) {
        console.log('No refId available, skipping referral data send');
        return;
      }

      try {
        const refData = {
          refkey: `${clientInfo.ipAddress}:${clientInfo.screenWidth}:${clientInfo.screenHeight}`,
          refvalue: refId
        };

        console.log('Sending referral data:', refData);

        const response = await fetch('/api/referral', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(refData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Referral data sent successfully:', result);
        } else {
          const error = await response.json();
          console.error('Failed to send referral data:', error);
        }
      } catch (error) {
        console.error('Error sending referral data:', error);
      }
    };

    const detectedOS = detectOS();
    setOs(detectedOS);

    // Detect client information and send referral data
    const initializeClient = async () => {
      const clientInfo = await detectClientInfo();
      setClientInfo(clientInfo);
      
      // Send referral data only if refId is available
      if (refId) {
        await sendReferralData(clientInfo);
      }
    };

    initializeClient();

    // Start countdown and redirect if OS is detected
    if (detectedOS) {
      setIsRedirecting(true);
      const redirectUrl = detectedOS === 'android' ? ANDROID_URL : IOS_URL;
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Clear the redirecting state immediately
            setIsRedirecting(false);
            setCountdown(3);
            window.location.href = redirectUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [refId]);

  const handleAndroidClick = () => {
    window.open(ANDROID_URL, '_blank');
  };

  const handleIOSClick = () => {
    window.open(IOS_URL, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Download CleanApp</h1>
            <p className="text-gray-600">
              {os 
                ? `Detected ${os === 'android' ? 'Android' : 'iOS'} device`
                : 'Choose your platform to download the CleanApp mobile application'
              }
            </p>
          </div>

          {os ? (
            // Show detected OS button
            <div className="space-y-6">
              <button
                onClick={os === 'android' ? handleAndroidClick : handleIOSClick}
                className={`w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-lg transition-colors duration-200 ${
                  os === 'android' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {os === 'android' ? (
                  <>
                    <Play className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Google Play Store</div>
                      <div className="text-sm opacity-90">Download for Android</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Apple className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Apple App Store</div>
                      <div className="text-sm opacity-90">Download for iOS</div>
                    </div>
                  </>
                )}
              </button>

              {isRedirecting && (
                <>
                  {/* Countdown Animation */}
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full">
                      <div className="animate-pulse">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                      <span className="text-blue-800 font-medium">
                        Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 text-center">
                      We detected your {os === 'android' ? 'Android' : 'iOS'} device and will redirect you automatically.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Show both buttons for manual selection
            <>
              <div className="space-y-4">
                <button
                  onClick={handleAndroidClick}
                  className="w-full flex items-center justify-center space-x-3 bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <Play className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Google Play Store</div>
                    <div className="text-sm opacity-90">Download for Android</div>
                  </div>
                </button>

                <button
                  onClick={handleIOSClick}
                  className="w-full flex items-center justify-center space-x-3 bg-black text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  <Apple className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Apple App Store</div>
                    <div className="text-sm opacity-90">Download for iOS</div>
                  </div>
                </button>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 text-center">
                  Can&apos;t determine your device? Select your platform above to download the app.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 