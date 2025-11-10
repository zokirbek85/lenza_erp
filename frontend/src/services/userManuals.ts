import http from '../app/http';

export interface UserManual {
  id: number;
  title: string;
  content: string;
  role: 'admin' | 'director' | 'accountant' | 'warehouse' | 'sales';
  created_at: string;
}

export const getUserManuals = async (): Promise<UserManual[]> => {
  const res = await http.get('/api/user-manuals/');
  const data = res.data;
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return data.results as UserManual[];
  }
  return Array.isArray(data) ? (data as UserManual[]) : [];
};
