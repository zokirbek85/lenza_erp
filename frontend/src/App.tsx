import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Spin } from 'antd';
import router from './app/router';
import { ThemeProvider } from './context/ThemeContext';

// Simple fallback while lazy components load
function LoadingFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'sans-serif' 
    }}>
      <Spin size="large" tip="Loading..." />
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