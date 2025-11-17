import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { UserRole } from './useAuthStore';
import { useAuthStore } from './useAuthStore';

interface ProtectedProps {
  children: ReactNode;
  roles?: UserRole[];
}

const ProtectedRoute = ({ roles, children }: ProtectedProps) => {
  const location = useLocation();
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!role) {
    return null;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
