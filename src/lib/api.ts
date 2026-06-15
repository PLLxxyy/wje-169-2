import type { ApiResponse } from '@/types';

const BASE_URL = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: ApiResponse<T>;
  
  try {
    data = text ? (JSON.parse(text) as ApiResponse<T>) : { success: true } as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new Error(`请求失败 (HTTP ${response.status})`);
    }
    return undefined as T;
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || '请求失败');
  }

  return data.data as T;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      request('/auth/logout', { method: 'POST' }),
  },

  users: {
    list: () => request<any[]>('/users'),
    managers: () => request<any[]>('/users/managers'),
    me: () => request<any>('/users/me'),
  },

  projects: {
    list: () => request<any[]>('/projects'),
    get: (id: number) => request<any>(`/projects/${id}`),
    create: (data: any) =>
      request('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request(`/projects/${id}`, { method: 'DELETE' }),
  },

  tasks: {
    list: (projectId: number) => request<any[]>(`/projects/${projectId}/tasks`),
    create: (projectId: number, data: any) =>
      request(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (projectId: number, taskId: number, data: any) =>
      request(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (projectId: number, taskId: number) =>
      request(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
  },

  timeEntries: {
    list: (params?: { projectId?: number; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams();
      if (params?.projectId) query.set('projectId', String(params.projectId));
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      const qs = query.toString();
      return request<any[]>(`/time-entries${qs ? `?${qs}` : ''}`);
    },
    byProject: (projectId: number) =>
      request<any[]>(`/time-entries/project/${projectId}`),
    create: (data: any) =>
      request('/time-entries', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request(`/time-entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request(`/time-entries/${id}`, { method: 'DELETE' }),
    approve: (id: number) =>
      request(`/time-entries/${id}/approve`, { method: 'POST' }),
    reject: (id: number) =>
      request(`/time-entries/${id}/reject`, { method: 'POST' }),
  },

  stats: {
    projects: () => request<any[]>('/stats/projects'),
    projectDetail: (id: number) => request<any>(`/stats/projects/${id}`),
    personal: () => request<any>('/stats/personal'),
    overview: () => request<any>('/stats/overview'),
  },
};
