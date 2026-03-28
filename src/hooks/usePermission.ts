import { useRoleStore } from '../store/roleStore';
import { can, type Permission } from '../types';

/** Returns true if the current user has the given permission. */
export const usePermission = (permission: Permission): boolean => {
  const { role } = useRoleStore();
  return can(role, permission);
};

/** Returns the current user's role. */
export const useRole = () => useRoleStore(s => s.role);
