import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './app/router';

// Simple fallback while lazy components load
function LoadingFallback() {
  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <span>Loading...</span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>        
      <RouterProvider router={router} />
    </Suspense>
  );
}