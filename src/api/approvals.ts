import apiClient from './client';
import type { Approval } from '../types';

export const approvalsApi = {
  getAll: () => apiClient.get<Approval[]>('/approvals').then(r => r.data),
  approve: (ruleId: string, comment?: string) =>
    apiClient.post(`/approvals/${ruleId}/approve`, { comment }).then(r => r.data),
  reject: (ruleId: string, comment?: string) =>
    apiClient.post(`/approvals/${ruleId}/reject`, { comment }).then(r => r.data),
};
