// Ant Design v5 + React 19 compatibility patch
import '@ant-design/v5-patch-for-react-19';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Initialize i18n side effects before App mounts
import './i18n';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';

// Prevent browser extension conflicts
// Suppress chrome.runtime errors from extensions
if (typeof window !== 'undefined') {
  // Create a safe error handler for extension conflicts
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Filter out known extension-related errors
    const errorString = args.join(' ');
    if (
      errorString.includes('chrome.runtime') ||
      errorString.includes('message port closed') ||
      errorString.includes('Extension context invalidated')
    ) {
      // Silently ignore extension errors
      return;
    }
    originalError.apply(console, args);
  };

  // Prevent unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('chrome.runtime') ||
      reason.includes('message port closed') ||
      reason.includes('Extension context')
    ) {
      // Prevent default error logging for extension errors
      event.preventDefault();
    }
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Translation strings
const translations = {
  "otpRequired": "OTP kod talab qilinadi",
  "invalidOtp": "OTP noto'g'ri",
  "setup2fa": "Accountant rol uchun 2FA sozlash talab qilinadi"
};

export default translations;
