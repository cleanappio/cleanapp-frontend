import { useEffect } from "react";
import { useRouter } from "next/router";

const CleanAppPro = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page since this is now handled as a modal in GlobeView
    router.push('/');
  }, [router]);

  return null;
};

export default CleanAppPro;
