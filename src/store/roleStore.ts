import { create } from 'zustand';
import type { Role, UserProfile } from '../types';

interface RoleState {
  profile: UserProfile | null;
  role: Role | null;
  profileLoading: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setProfileLoading: (loading: boolean) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  profile: null,
  role: null,
  profileLoading: true,
  setProfile: (profile) => set({ profile, role: profile?.role ?? null }),
  setProfileLoading: (profileLoading) => set({ profileLoading }),
}));
