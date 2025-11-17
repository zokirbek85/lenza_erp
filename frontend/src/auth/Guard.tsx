import { type PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from './useAuthStore';
import type { AppRole } from './routeAccess';
import { canAccessRoute } from './routeAccess';

interface GuardProps {
  roles?: AppRole[];
}

const Guard = ({ roles, children }: PropsWithChildren<GuardProps>) => {
  const location = useLocation();
  const { isAuthenticated, role } = useAuthStore();
  const typedRole = (role ?? null) as AppRole | null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (typedRole && !canAccessRoute(typedRole, location.pathname)) {
    return <Navigate to="/kpi" replace state={{ from: location, reason: 'forbidden' }} />;
  }

  if (roles && roles.length > 0 && typedRole && !roles.includes(typedRole)) {
    return <Navigate to="/login" replace state={{ from: location, reason: 'unauthorized' }} />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
};

export default Guard;
