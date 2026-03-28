import apiClient from './client';
import type { SweepRule } from '../types';

export const rulesApi = {
  getAll: () => apiClient.get<SweepRule[]>('/rules').then(r => r.data),
  create: (data: Omit<SweepRule, 'id' | 'status' | 'createdBy' | 'createdAt'>) =>
    apiClient.post<SweepRule>('/rules', data).then(r => r.data),
  update: (id: string, data: Partial<SweepRule>) =>
    apiClient.put<SweepRule>(`/rules/${id}`, data).then(r => r.data),
  clone: (id: string) => apiClient.post<SweepRule>(`/rules/${id}/clone`).then(r => r.data),
  submit: (id: string) => apiClient.post<SweepRule>(`/rules/${id}/submit`).then(r => r.data),
  activate: (id: string) => apiClient.post<SweepRule>(`/rules/${id}/activate`).then(r => r.data),
  pause: (id: string) => apiClient.post<SweepRule>(`/rules/${id}/pause`).then(r => r.data),
  execute: (id: string) => apiClient.post(`/sweeping/${id}/execute`).then(r => r.data),
};
