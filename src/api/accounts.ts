import apiClient from './client';
import type { Account } from '../types';

export const accountsApi = {
  getAll: () => apiClient.get<Account[]>('/accounts').then(r => r.data),
  create: (data: Omit<Account, 'id' | 'createdAt'>) =>
    apiClient.post<Account>('/accounts', data).then(r => r.data),
  update: (id: string, data: Partial<Account>) =>
    apiClient.put<Account>(`/accounts/${id}`, data).then(r => r.data),
  updateStatus: (id: string, status: 'active' | 'inactive') =>
    apiClient.patch<Account>(`/accounts/${id}/status`, { status }).then(r => r.data),
};
