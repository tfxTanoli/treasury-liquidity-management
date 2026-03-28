import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useRoleStore } from '../store/roleStore';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { Bell, LogOut, User, ChevronDown, Settings } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/accounts': 'Accounts',
  '/liquidity-structures': 'Liquidity Structures',
  '/pooling': 'Pooling',
  '/sweeping-rules': 'Sweeping Rules',
  '/approvals': 'Approvals',
  '/executions': 'Execution History',
  '/user-management': 'User Management',
  '/settings': 'Settings',
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { role } = useRoleStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = pageTitles[location.pathname] || 'TreasuryOS';

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={14} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Signed in as</p>
                <p className="text-xs font-medium text-gray-700 truncate">{user?.email}</p>
                {role && (
                  <span className={`badge mt-1.5 text-xs ${ROLE_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings size={14} />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
