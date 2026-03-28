import apiClient from './client';
import type { UserProfile, Role } from '../types';

export const usersApi = {
  register: (displayName: string) =>
    apiClient.post<UserProfile>('/users/register', { displayName }).then(r => r.data),
  getMe: () => apiClient.get<UserProfile>('/users/me').then(r => r.data),
  updateDisplayName: (displayName: string) =>
    apiClient.patch<UserProfile>('/users/me/display-name', { displayName }).then(r => r.data),
  getAll: () => apiClient.get<UserProfile[]>('/users').then(r => r.data),
  create: (data: { email: string; password: string; displayName: string; role: Role }) =>
    apiClient.post<UserProfile>('/users', data).then(r => r.data),
  updateRole: (uid: string, role: Role) =>
    apiClient.patch<UserProfile>(`/users/${uid}/role`, { role }).then(r => r.data),
  setDisabled: (uid: string, disabled: boolean) =>
    apiClient.patch(`/users/${uid}/disable`, { disabled }).then(r => r.data),
};
