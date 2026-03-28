import apiClient from './client';
import type { Pool } from '../types';

export const poolsApi = {
  getAll: () => apiClient.get<Pool[]>('/pools').then(r => r.data),
  create: (data: { name: string; headerAccountId: string }) =>
    apiClient.post<Pool>('/pools', data).then(r => r.data),
  addAccount: (poolId: string, accountId: string) =>
    apiClient.post(`/pools/${poolId}/add-account`, { accountId }).then(r => r.data),
  removeAccount: (poolId: string, accountId: string) =>
    apiClient.delete(`/pools/${poolId}/remove-account`, { data: { accountId } }).then(r => r.data),
  execute: (poolId: string) =>
    apiClient.post(`/pooling/${poolId}/execute`).then(r => r.data),
};
