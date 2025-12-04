import { useEffect, useState, useCallback } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const usePwa = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const disableSw = (import.meta.env.VITE_DISABLE_SW ?? 'false').toString().toLowerCase() === 'true';

  // Service Worker registration with proper error handling
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (disableSw) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch((error) => {
            console.warn('Service worker unregister failed', error);
          });
        });
      }).catch((error) => {
        console.warn('Failed to get service worker registrations', error);
      });
      return;
    }

    // Register service worker with better error handling
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        // Check for updates periodically
        setInterval(() => {
          registration.update().catch(() => {
            // Silently ignore update errors
          });
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.warn('Service worker registration failed', error);
      });
  }, [disableSw]);

  // PWA Install Prompt Handler - proper lifecycle
  useEffect(() => {
    let isListenerActive = true;

    const handler = (event: Event) => {
      // Prevent the default browser install prompt
      event.preventDefault();
      
      // Only store if listener is still active (prevent memory leaks)
      if (isListenerActive) {
        // Store the event so we can trigger it later
        setInstallEvent(event as BeforeInstallPromptEvent);
      }
    };

    try {
      window.addEventListener('beforeinstallprompt', handler);
    } catch (error) {
      console.warn('Failed to add beforeinstallprompt listener', error);
    }

    return () => {
      isListenerActive = false;
      try {
        window.removeEventListener('beforeinstallprompt', handler);
      } catch (error) {
        console.warn('Failed to remove beforeinstallprompt listener', error);
      }
    };
  }, []);

  // Online/Offline detection with error handling
  useEffect(() => {
    const goOffline = () => {
      try {
        setOffline(true);
      } catch (error) {
        console.warn('Error setting offline state', error);
      }
    };
    
    const goOnline = () => {
      try {
        setOffline(false);
      } catch (error) {
        console.warn('Error setting online state', error);
      }
    };

    try {
      window.addEventListener('offline', goOffline);
      window.addEventListener('online', goOnline);
    } catch (error) {
      console.warn('Failed to add online/offline listeners', error);
    }

    return () => {
      try {
        window.removeEventListener('offline', goOffline);
        window.removeEventListener('online', goOnline);
      } catch (error) {
        console.warn('Failed to remove online/offline listeners', error);
      }
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      // Show the install prompt
      await installEvent.prompt();
      
      // Wait for the user's response
      const choiceResult = await installEvent.userChoice;
      
      // Clear the stored event
      setInstallEvent(null);
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.warn('Install prompt failed', error);
      setInstallEvent(null);
      return false;
    }
  }, [installEvent]);

  return {
    offline,
    canInstall: Boolean(installEvent),
    promptInstall,
  };
};
