import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export const usePwa = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const disableSw = (import.meta.env.VITE_DISABLE_SW ?? 'false').toString().toLowerCase() === 'true';

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (disableSw) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch((error) => {
            console.error('Service worker unregister failed', error);
          });
        });
      });
      return;
    }

    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service worker registration failed', error);
    });
  }, [disableSw]);

  useEffect(() => {
    const handler = (event: Event) => {
      // Prevent default browser install prompt so we can show custom UI
      event.preventDefault();
      // Store event for later use when user clicks our custom install button
      setInstallEvent(event as BeforeInstallPromptEvent);
      console.info('[PWA] Install prompt available');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const promptInstall = async () => {
    if (!installEvent) {
      console.warn('[PWA] No install event available');
      return;
    }
    try {
      // Show the browser's install prompt
      await installEvent.prompt();
      console.info('[PWA] Install prompt shown');
      // Clear the event after showing (can only be used once)
      setInstallEvent(null);
    } catch (error) {
      console.error('[PWA] Failed to show install prompt:', error);
    }
  };

  return {
    offline,
    canInstall: Boolean(installEvent),
    promptInstall,
  };
};
