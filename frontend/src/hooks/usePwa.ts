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
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
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
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  return {
    offline,
    canInstall: Boolean(installEvent),
    promptInstall,
  };
};
