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
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 600 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>{title}</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>{message}</p>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 24 }}>Kod: {status}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/">Bosh sahifaga qaytish</Link>
          <a href={typeof window !== 'undefined' ? window.location.pathname : '/'} onClick={() => window.location.reload()}>Qayta yuklash</a>
        </div>
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
