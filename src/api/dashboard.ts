import apiClient from './client';
import type { DashboardSummary, Execution } from '../types';

export const dashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary').then(r => r.data),
  getExecutions: (params?: { type?: string; status?: string; limit?: number }) =>
    apiClient.get<Execution[]>('/executions', { params }).then(r => r.data),
};
