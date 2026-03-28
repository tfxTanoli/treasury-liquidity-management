export type Role = 'admin' | 'treasury_manager' | 'approver' | 'viewer';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  treasury_manager: 'Treasury Manager',
  approver: 'Approver / Finance Lead',
  viewer: 'Viewer / Auditor',
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  treasury_manager: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  approver: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  viewer: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
  disabled?: boolean;
  createdAt?: any;
}

// Permission map (mirrors backend)
export const PERMISSIONS = {
  accounts_read:    ['admin', 'treasury_manager', 'approver', 'viewer'],
  accounts_write:   ['admin', 'treasury_manager'],
  pools_read:       ['admin', 'treasury_manager', 'approver', 'viewer'],
  pools_write:      ['admin', 'treasury_manager'],
  pooling_execute:  ['admin', 'treasury_manager'],
  rules_read:       ['admin', 'treasury_manager', 'approver', 'viewer'],
  rules_write:      ['admin', 'treasury_manager'],
  rules_submit:     ['admin', 'treasury_manager'],
  rules_activate:   ['admin', 'approver'],
  rules_pause:      ['admin', 'approver'],
  approvals_read:   ['admin', 'treasury_manager', 'approver', 'viewer'],
  approvals_write:  ['admin', 'approver'],
  sweeping_execute: ['admin', 'approver'],
  executions_read:  ['admin', 'treasury_manager', 'approver', 'viewer'],
  dashboard_read:   ['admin', 'treasury_manager', 'approver', 'viewer'],
  users_read:       ['admin'],
  users_write:      ['admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role | null | undefined, permission: Permission): boolean => {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
};

export interface Account {
  id: string;
  name: string;
  number: string;
  currency: string;
  balance: number;
  region: string;
  status: 'active' | 'inactive';
  isHeaderAllowed: boolean;
  createdAt?: any;
}

export interface Pool {
  id: string;
  name: string;
  headerAccountId: string;
  createdAt?: any;
  accounts?: Account[];
  poolAccounts?: PoolAccount[];
}

export interface PoolAccount {
  id: string;
  poolId: string;
  accountId: string;
  role: 'header' | 'child';
}

export type RuleType = 'zero' | 'target' | 'threshold' | 'deficit';
export type RuleStatus = 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'rejected';

export interface SweepRule {
  id: string;
  name: string;
  type: RuleType;
  sourceAccountId: string;
  targetAccountId: string;
  thresholdValue?: number;
  targetBalance?: number;
  status: RuleStatus;
  createdBy: string;
  createdAt?: any;
}

export interface Approval {
  id: string;
  ruleId: string;
  status: 'approved' | 'rejected';
  approvedBy: string;
  comment?: string;
  timestamp?: any;
}

export type ExecutionStatus = 'completed' | 'failed' | 'skipped';

export interface Execution {
  id: string;
  type: 'pooling' | 'sweeping';
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  status: ExecutionStatus;
  timestamp?: any;
  failureReason?: string;
  ruleId?: string;
  poolId?: string;
  executedBy?: string;
}

export interface DashboardSummary {
  totalAccounts: number;
  activeAccounts: number;
  totalPools: number;
  totalRules: number;
  activeRules: number;
  pendingApprovals: number;
  totalBalance: number;
  balanceByCurrency: Record<string, number>;
  totalTransferred: number;
  recentExecutions: Execution[];
}
