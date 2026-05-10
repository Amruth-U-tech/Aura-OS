import { useState, useEffect, useCallback } from 'react';

export function usePWA() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  // Using useState to persist the event as part of the React component's state
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      console.log('[PWA] Install prompt captured');
      
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalling(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = useCallback(async () => {
    console.log('[PWA] Install button clicked');
    
    if (!deferredPrompt) {
      console.warn('[PWA] Cannot prompt: deferredPrompt is null');
      return;
    }
    
    console.log('[PWA] Triggering deferredPrompt.prompt() synchronously');
    
    try {
      // MUST call prompt() immediately in the click handler to satisfy browser user gesture requirements
      const promptPromise = deferredPrompt.prompt();
      
      // Now update React state
      setIsInstalling(true);
      
      await promptPromise;
      console.log('[PWA] Native install prompt opened');
      
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install');
        setIsInstallable(false);
      } else {
        console.log('[PWA] User dismissed install');
      }
    } catch (err) {
      console.error('[PWA] Error during prompt:', err);
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
      setIsInstallable(false);
    }
  }, [deferredPrompt]); // Add deferredPrompt to dependencies so the closure always has the latest event

  return { isOffline, isInstallable, isInstalling, installPWA };
}
