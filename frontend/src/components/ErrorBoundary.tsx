import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function RouterErrorBoundary() {
  const error = useRouteError();

  let title = 'Kutilmagan xatolik';
  let message = "Noma'lum xato yuz berdi. Iltimos, qayta urining.";
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = 'Sahifa topilmadi (404)';
      message = "Qidirilgan sahifa topilmadi yoki ko'chirilgan bo'lishi mumkin.";
    } else if (error.status === 401) {
      title = 'Kirish talab qilinadi (401)';
      message = 'Bu sahifani ko‘rish uchun tizimga kiring.';
    } else if (error.status === 403) {
      title = 'Ruxsat yo‘q (403)';
      message = 'Bu sahifaga kirish huquqiga ega emassiz.';
    } else {
      title = `Xatolik (${error.status})`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
    console.error('Router error details:', error);
    console.error('Error stack:', error.stack);
  }

  // Log for debugging
  console.error('RouterErrorBoundary - Full error object:', error);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 600 }}>
        <h1 className="font-heading" style={{ fontSize: 28, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{message}</p>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Kod: {status}</div>
        {error instanceof Error && error.stack && (
          <details style={{ marginBottom: 16, textAlign: 'left', fontSize: 11, color: 'var(--text-tertiary)' }}>
            <summary style={{ cursor: 'pointer', marginBottom: 8, textAlign: 'center' }}>Texnik ma'lumotlar (developers uchun)</summary>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word', 
              background: 'var(--bg-secondary)', 
              padding: 12, 
              borderRadius: 4, 
              maxHeight: '300px', 
              overflow: 'auto',
              border: '1px solid var(--border-base)',
            }}>
              {error.stack}
            </pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link 
            to="/" 
            style={{ 
              padding: '8px 16px', 
              background: 'var(--lenza-gold)', 
              color: 'var(--text-primary)', 
              borderRadius: '4px', 
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Bosh sahifaga qaytish
          </Link>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '8px 16px', 
              background: 'var(--success)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Qayta yuklash
          </button>
          <button 
            onClick={() => { 
              localStorage.clear(); 
              sessionStorage.clear(); 
              if ('caches' in window) {
                caches.keys().then(names => names.forEach(name => caches.delete(name)));
              }
              setTimeout(() => window.location.reload(), 100);
            }} 
            style={{ 
              padding: '8px 16px', 
              background: 'var(--warning)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cache tozalash va qayta yuklash
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 16 }}>
          Agar muammo davom etsa, brauzer cache'ini to'liq tozalang (Ctrl+Shift+Delete)
        </p>
      </div>
    </div>
  );
}
import React from 'react';
import { Result, Button, Typography } from 'antd';

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Optional: send to monitoring service here
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      const title = 'Unexpected Application Error';
      const subTitle = 'A page crashed while rendering. You can reload the app or go back and try again.';
      const errorText = this.state.error ? String(this.state.error) : '';

      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Result
            status="error"
            title={title}
            subTitle={subTitle}
            extra={[
              <Button type="primary" key="reload" onClick={() => window.location.reload()}>
                Reload
              </Button>,
            ]}
          >
            {errorText && (
              <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 6, expandable: true, symbol: 'show details' }}>
                  {errorText}
                </Typography.Paragraph>
              </div>
            )}
          </Result>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
