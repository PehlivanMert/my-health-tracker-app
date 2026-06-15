import { useState, useEffect } from "react";

export const usePlatform = () => {
  const [isPWA, setIsPWA] = useState(false);
  const [platform, setPlatform] = useState("web");
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      const isMobileDevice =
        /mobile|android|iphone|ipad|ipod|blackberry|windows phone/.test(
          userAgent
        );

      const isInStandaloneMode = () =>
        (window.matchMedia &&
          window.matchMedia("(display-mode: standalone)").matches) ||
        navigator.standalone === true;

      const pwaMode = isInStandaloneMode();

      setIsIOS(isIOSDevice);
      setIsMobile(isMobileDevice);
      setIsPWA(pwaMode);

      if (isIOSDevice && pwaMode) {
        setPlatform("ios-pwa");
      } else if (isAndroidDevice && pwaMode) {
        setPlatform("android-pwa");
      } else if (isMobileDevice) {
        setPlatform("mobile-web");
      } else {
        setPlatform("desktop-web");
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`🌐 [PLATFORM] Tespit edilen platform: ${platform}`, {
          isIOS: isIOSDevice,
          isMobile: isMobileDevice,
          isPWA: pwaMode,
          userAgent: userAgent,
        });
      }
    };

    detectPlatform();
  }, [platform]);

  return { isPWA, platform, isIOS, isMobile };
};
