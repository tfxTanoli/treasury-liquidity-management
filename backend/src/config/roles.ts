export type Role = 'admin' | 'treasury_manager' | 'approver' | 'viewer';

export const ROLES: Record<Role, Role> = {
  admin: 'admin',
  treasury_manager: 'treasury_manager',
  approver: 'approver',
  viewer: 'viewer',
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  treasury_manager: 'Treasury Manager',
  approver: 'Approver / Finance Lead',
  viewer: 'Viewer / Auditor',
};

/**
 * Permission matrix — maps each action to the roles allowed to perform it.
 */
export const PERMISSIONS = {
  // Accounts
  accounts_read:   ['admin', 'treasury_manager', 'approver', 'viewer'],
  accounts_write:  ['admin', 'treasury_manager'],

  // Pools
  pools_read:      ['admin', 'treasury_manager', 'approver', 'viewer'],
  pools_write:     ['admin', 'treasury_manager'],
  pooling_execute: ['admin', 'treasury_manager'],

  // Sweep rules
  rules_read:      ['admin', 'treasury_manager', 'approver', 'viewer'],
  rules_write:     ['admin', 'treasury_manager'],
  rules_submit:    ['admin', 'treasury_manager'],
  rules_activate:  ['admin', 'approver'],
  rules_pause:     ['admin', 'approver'],

  // Approvals
  approvals_read:  ['admin', 'treasury_manager', 'approver', 'viewer'],
  approvals_write: ['admin', 'approver'],

  // Sweeping execution
  sweeping_execute: ['admin', 'approver'],

  // Executions
  executions_read: ['admin', 'treasury_manager', 'approver', 'viewer'],

  // Dashboard
  dashboard_read:  ['admin', 'treasury_manager', 'approver', 'viewer'],

  // User management
  users_read:      ['admin'],
  users_write:     ['admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const hasPermission = (role: Role, permission: Permission): boolean => {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
};
