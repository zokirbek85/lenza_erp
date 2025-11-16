import { useEffect, useState } from 'react';

type DeviceType = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

const BREAKPOINT = 768;
const DEBOUNCE_MS = 80;

export const useIsMobile = (): DeviceType => {
  const [state, setState] = useState<DeviceType>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${BREAKPOINT}px)`);
    let timeout: ReturnType<typeof window.setTimeout> | undefined;

    const update = () => {
      const width = window.innerWidth;
      const isMobile = width <= BREAKPOINT;
      const isTablet = width > BREAKPOINT && width <= 1024;
      const isDesktop = width > 1024;
      setState({ isMobile, isTablet, isDesktop });
    };

    const listener = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(update, DEBOUNCE_MS);
    };

    update();
    mediaQuery.addEventListener('change', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, []);

  return state;
};
