import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../auth/useAuthStore';

const EVENT_MAP: Record<string, string> = {
  'orders.status': 'orders:refresh',
  'payments.created': 'payments:refresh',
  'payments.updated': 'payments:refresh',
  payment_added: 'payments:refresh',
  'currency.rate': 'currency:refresh',
  notification: 'notifications:refresh',
};

const prettyMessage = (event: string, data: Record<string, unknown>): string => {
  switch (event) {
    case 'orders.status':
      return `Order ${data.order ?? ''} → ${data.status ?? ''}`;
    case 'payments.created':
      return `New payment: ${data.amount ?? ''} ${data.currency ?? ''}`;
    case 'payments.updated':
      return `Payment updated for ${data.dealer ?? ''}`;
    case 'payment_added':
      return `Payment added: ${data.amount ?? ''} ${data.currency ?? ''}`;
    case 'currency.rate':
      return `New currency rate for ${data.rate_date ?? ''}`;
    case 'notification':
      return typeof data.title === 'string' ? data.title : 'New notification';
    default:
      return 'New activity received';
  }
};

const resolveWsBase = (): string => {
  // Priority 1: Explicit VITE_WS_URL from environment
  const explicit = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';
  if (explicit.trim()) {
    return explicit;
  }

  // Priority 2: Derive from VITE_API_URL
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  if (apiBase && apiBase.trim()) {
    try {
      const url = new URL(apiBase);
      // Force wss:// for HTTPS origins
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      console.warn('[WS] Invalid API URL for WS resolution', error);
    }
  }

  // Priority 3: Use current window.location (respects HTTPS)
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Automatically use wss:// for HTTPS pages
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Production domain: use domain without port
    if (hostname.includes('erp.lenza.uz') || hostname.includes('lenza')) {
      return `${wsProtocol}//erp.lenza.uz`;
    }
    
    // Development or other domains
    const normalizedHost = hostname || 'localhost';
    const fallbackPort = port || (['localhost', '127.0.0.1'].includes(normalizedHost) ? '8000' : '');
    const portPart = fallbackPort ? `:${fallbackPort}` : '';
    return `${wsProtocol}//${normalizedHost}${portPart}`;
  }

  // Final fallback for SSR/development
  return import.meta.env.DEV ? 'ws://127.0.0.1:8000' : 'wss://erp.lenza.uz';
};

export const useGlobalSocket = () => {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const token = localStorage.getItem('lenza_access_token');
    if (!token) {
      console.warn('[WS] No access token found');
      return;
    }

    const base = resolveWsBase().replace(/\/$/, '');
    const url = `${base}/ws/notifications/?token=${token}`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      socket = new WebSocket(url);

      socket.onopen = () => {
        console.info('[WS] Connected to', url);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event) {
            // Legacy broadcast shape: { event, data }
            const eventData = (payload.data ?? {}) as Record<string, unknown>;
            const message = prettyMessage(String(payload.event), eventData);
            toast.success(message);
            const mapped = EVENT_MAP[payload.event];
            if (mapped) {
              window.dispatchEvent(new CustomEvent(mapped, { detail: eventData }));
            }
          } else {
            // Direct notification payload
            const eventData = payload as Record<string, unknown>;
            const message = prettyMessage('notification', eventData);
            toast.success(message);
            const mapped = EVENT_MAP['notification'];
            window.dispatchEvent(new CustomEvent(mapped, { detail: eventData }));
          }
        } catch (error) {
          console.error('WS parse error', error);
        }
      };

      socket.onerror = (event) => {
        console.error('[WS] connection error', event);
      };

      socket.onclose = (event) => {
        if (!event.wasClean) {
          console.warn('[WS] closed unexpectedly', event.code, event.reason);
          // Reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            console.info('[WS] Attempting reconnect...');
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [isAuthenticated]);
};
