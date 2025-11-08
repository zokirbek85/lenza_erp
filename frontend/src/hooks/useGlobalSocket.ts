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
  const explicit = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';
  if (explicit.trim()) {
    return explicit;
  }

  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      console.warn('Invalid API URL for WS resolution', error);
    }
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    const normalizedHost = hostname || 'localhost';
    const fallbackPort = port || (['localhost', '127.0.0.1'].includes(normalizedHost) ? '8000' : '');
    const portPart = fallbackPort ? `:${fallbackPort}` : '';
    return `${wsProtocol}//${normalizedHost}${portPart}`;
  }

  return 'ws://127.0.0.1:8000';
};

export const useGlobalSocket = () => {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const base = resolveWsBase().replace(/\/$/, '');
    const url = `${base}/ws/global/`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.info('[WS] Connected to', url);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.event) {
          const eventData = (payload.data ?? {}) as Record<string, unknown>;
          const message = prettyMessage(String(payload.event), eventData);
          toast.success(message);
          const mapped = EVENT_MAP[payload.event];
          if (mapped) {
            window.dispatchEvent(new CustomEvent(mapped, { detail: eventData }));
          }
        }
      } catch (error) {
        console.error('WS parse error', error);
      }
    };

    socket.onerror = (event) => {
      console.error('[WS] connection error', event);
      toast.error('WebSocket connection error');
    };

    socket.onclose = (event) => {
      if (!event.wasClean) {
        console.warn('[WS] closed unexpectedly', event.code, event.reason);
      }
    };

    return () => {
      socket.close();
    };
  }, [isAuthenticated]);
};
