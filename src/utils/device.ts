export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // If the window width is desktop size, do not treat it as a mobile device.
  // This ensures proper desktop layouts are served in Chrome "Desktop site" mode
  // and on larger viewports.
  if (window.innerWidth >= 980) {
    return false;
  }

  const ua = navigator.userAgent || '';
  
  // 1. Direct regex match for mobile user agents
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(ua);
  
  // 2. Check for iPad specifically (which we want to treat as tablet, but let's see)
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !/iPhone/i.test(ua));
  
  // 3. Touch capability
  const hasTouch = ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0) || 
                   ((navigator as any).msMaxTouchPoints > 0);
                   
  // 4. Mobile OS detection
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  
  // 5. User agent data for modern browsers
  let platformFromUAData = '';
  if ((navigator as any).userAgentData && (navigator as any).userAgentData.platform) {
    platformFromUAData = (navigator as any).userAgentData.platform;
  }
  const isAndroidViaUAData = /Android/i.test(platformFromUAData);
  
  // 6. Screen dimensions (phone vs tablet size)
  const screenLimit = Math.max(window.screen.width, window.screen.height);
  const isPhoneSize = screenLimit < 1024; // Most phones have a max CSS pixel dimension < 1024
  
  // Actual mobile device is:
  // - A mobile user agent that is not an iPad
  // - Or Android explicitly detected via userAgentData
  // - Or iOS device under phone size (to allow tablet iPads to use tablet view)
  // - Or has touch and is Android
  // - Or has touch, is a Linux-based platform, and has phone dimensions (covers Android Chrome Desktop Mode)
  const isRealMobile = (isMobileUA && !isIPad) || 
                       isAndroidViaUAData ||
                       (isIOS && isPhoneSize) || 
                       (hasTouch && isAndroid) ||
                       (hasTouch && /Linux/i.test(ua) && isPhoneSize);
                       
  return !!isRealMobile;
};
