import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Layers,
  ArrowRightLeft,
  GitBranch,
  CheckSquare,
  ClipboardList,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useRoleStore } from '../store/roleStore';
import { can, ROLE_LABELS, ROLE_COLORS } from '../types';

const allNavItems = [
  { to: '/',                    label: 'Dashboard',           icon: LayoutDashboard, end: true,  permission: 'dashboard_read'  as const },
  { to: '/accounts',            label: 'Accounts',            icon: Building2,                   permission: 'accounts_read'   as const },
  { to: '/liquidity-structures',label: 'Liquidity Structures',icon: Layers,                      permission: 'pools_read'      as const },
  { to: '/pooling',             label: 'Pooling',             icon: ArrowRightLeft,              permission: 'pooling_execute' as const },
  { to: '/sweeping-rules',      label: 'Sweeping Rules',      icon: GitBranch,                   permission: 'rules_read'      as const },
  { to: '/approvals',           label: 'Approvals',           icon: CheckSquare,                 permission: 'approvals_read'  as const },
  { to: '/executions',          label: 'Execution History',   icon: ClipboardList,               permission: 'executions_read' as const },
  { to: '/user-management',     label: 'User Management',     icon: Users,                       permission: 'users_read'      as const },
  { to: '/settings',            label: 'Settings',            icon: Settings,                    permission: null },
];

export default function Sidebar() {
  const { role } = useRoleStore();

  const visibleItems = allNavItems.filter(
    item => item.permission === null || can(role, item.permission)
  );

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">TreasuryOS</p>
            <p className="text-gray-400 text-xs mt-0.5">Liquidity Management</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      {role && (
        <div className="px-4 pt-3 pb-1">
          <span className={`badge text-xs ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {visibleItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">Treasury Liquidity v1.0</p>
      </div>
    </aside>
  );
}
