import type { UserRole } from './useAuthStore';

export type AppRole = Extract<UserRole, 'admin' | 'owner' | 'accountant' | 'warehouse' | 'sales'>;

const normalizePath = (path: string): string => {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.replace(/\/+$/, '');
};

const pathMatches = (allowedPath: string, pathname: string): boolean => {
  if (allowedPath === '*') return true;
  const allowed = normalizePath(allowedPath);
  const current = normalizePath(pathname);

  if (allowed === '/') {
    return current === '/';
  }

  if (current === allowed) {
    return true;
  }

  return current.startsWith(`${allowed}/`);
};

export const ROUTE_ACCESS: Record<AppRole, string[]> = {
  admin: ['*'],
  sales: [
    '/kpi',
    '/orders',
    '/products',
    '/catalog',
    '/marketing',
    '/dealers',
    '/payments',
    '/currency',
    '/returns',
    '/reconciliation',
    '/notifications',
    '/manuals',
  ],
  warehouse: ['/kpi', '/orders', '/products', '/returns', '/notifications', '/manuals'],
  accountant: [
    '/',
    '/orders',
    '/products',
    '/catalog',
    '/dealers',
    '/payments',
    '/expenses',
    '/currency',
    '/returns',
    '/reconciliation',
    '/kpi',
    '/notifications',
    '/manuals',
  ],
  owner: ['/', '/kpi', '/catalog', '/marketing', '/manuals'],
};

export const canAccessRoute = (role: UserRole | null, pathname: string): boolean => {
  if (!role) {
    return false;
  }
  const allowed = ROUTE_ACCESS[role as AppRole];
  if (!allowed || allowed.length === 0) {
    return false;
  }
  if (allowed.includes('*')) {
    return true;
  }
  return allowed.some((allowedPath) => pathMatches(allowedPath, pathname));
};

export const rolesForPath = (path: string): AppRole[] => {
  const normalized = normalizePath(path);
  return (Object.entries(ROUTE_ACCESS) as [AppRole, string[]][])
    .filter(([_, allowed]) => allowed.includes('*') || allowed.some((allowedPath) => pathMatches(allowedPath, normalized)))
    .map(([role]) => role);
};
