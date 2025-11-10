import http from '../app/http';

export async function updateOrderStatus(id: number, status: string) {
  // Backend exposes a custom status endpoint
  const { data } = await http.patch(`/api/orders/${id}/status/`, { status });
  return data;
}
