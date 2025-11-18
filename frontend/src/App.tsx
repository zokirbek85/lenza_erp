import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { Spin } from 'antd';
import router from './app/router';
import { ThemeProvider } from './context/ThemeContext';

// Simple fallback while lazy components load
function LoadingFallback() {
  const { t } = useTranslation();

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'sans-serif' 
    }}>
      <Spin size="large" tip={t('common.loading')} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<LoadingFallback />}>        
        <RouterProvider router={router} />
      </Suspense>
    </ThemeProvider>
  );
}
