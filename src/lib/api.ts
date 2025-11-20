const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:5000';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const message = (body && (body.message || body.error)) || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return body;
}

export const api = {
  auth: {
    signup: (data: {
      username: string;
      email: string;
      phone: string;
      password: string;
      userType: 'user' | 'admin' | 'staff';
      address?: string;
    }) =>
      request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: {
      identifier?: string;
      email?: string;
      username?: string;
      password: string;
      userType?: 'user' | 'admin' | 'staff';
    }) =>
      request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/api/auth/me', { method: 'GET' }),
    updateMe: (data: { username?: string; email?: string; phone?: string; address?: string }) =>
      request('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  },
  bookings: {
    create: (data: any) => request('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => request(`/api/bookings/${id}`, { method: 'GET' }),
    mine: () => request('/api/bookings', { method: 'GET' }),
    staffMine: () => request('/api/bookings/staff/my-orders', { method: 'GET' }),
    adminAll: () => request('/api/bookings/admin/all', { method: 'GET' }),
    updateStatus: (id: string, payload: { status?: string; paymentStatus?: string; assignedStaff?: any }) =>
      request(`/api/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
    addFeedback: (id: string, payload: { rating: number; message: string }) =>
      request(`/api/bookings/${id}/feedback`, { method: 'POST', body: JSON.stringify(payload) }),
    publicFeedback: (limit: number = 6) =>
      request(`/api/bookings/public/feedback?limit=${limit}`, { method: 'GET' }),
  },
  users: {
    list: () => request('/api/users', { method: 'GET' }),
    delete: (id: string) => request(`/api/users/${id}`, { method: 'DELETE' }),
  },
  staff: {
    list: () => request('/api/staff', { method: 'GET' }),
    create: (data: any) => request('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/staff/${id}`, { method: 'DELETE' }),
  },
  reports: {
    revenue: (scope: 'daily' | 'monthly' | 'yearly', opts?: { service?: string; status?: string }) => {
      const params = new URLSearchParams({ scope });
      if (opts?.service) params.set('service', opts.service);
      if (opts?.status) params.set('status', opts.status);
      return request(`/api/reports/revenue?${params.toString()}`, { method: 'GET' });
    }
  },
  subscriptions: {
    mine: () => request('/api/subscriptions/mine', { method: 'GET' }),
    history: () => request('/api/subscriptions/history', { method: 'GET' }),
    adminAll: () => request('/api/subscriptions/admin/all', { method: 'GET' }),
    weeklyPickup: (data: any) => request('/api/subscriptions/weekly-pickup', { method: 'POST', body: JSON.stringify(data) }),
    dailyPickup: (data: any) => request('/api/subscriptions/daily-pickup', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/subscriptions/${id}`, { method: 'DELETE' })
  }
};

export default api;
