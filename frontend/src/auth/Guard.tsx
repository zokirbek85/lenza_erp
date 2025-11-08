import { type PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { UserRole } from './useAuthStore';
import { useAuthStore } from './useAuthStore';

interface GuardProps {
  roles?: UserRole[];
}

const Guard = ({ roles, children }: PropsWithChildren<GuardProps>) => {
  const location = useLocation();
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && role && !roles.includes(role)) {
    return <Navigate to="/login" replace state={{ from: location, reason: 'unauthorized' }} />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
};

export default Guard;
