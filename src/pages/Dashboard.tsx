import { useEffect, useState } from 'react';
import type { DashboardSummary } from '../types';
import StatusBadge from '../components/StatusBadge';
import { dashboardApi } from '../api/dashboard';
import {
  Building2,
  Layers,
  GitBranch,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .getSummary()
      .then(setSummary)
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Total Accounts',
      value: summary?.totalAccounts ?? 0,
      sub: `${summary?.activeAccounts ?? 0} active`,
      icon: Building2,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Liquidity Pools',
      value: summary?.totalPools ?? 0,
      sub: 'Total pools',
      icon: Layers,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Sweep Rules',
      value: summary?.totalRules ?? 0,
      sub: `${summary?.activeRules ?? 0} active`,
      icon: GitBranch,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Pending Approvals',
      value: summary?.pendingApprovals ?? 0,
      sub: 'Awaiting review',
      icon: Clock,
      color: summary?.pendingApprovals ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-sm text-red-500">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${color}`}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Balance by Currency */}
        <div className="card p-5 col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Balance by Currency</h3>
          </div>
          {summary?.balanceByCurrency && Object.keys(summary.balanceByCurrency).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(summary.balanceByCurrency).map(([currency, balance]) => (
                <div key={currency} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">
                        {currency.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{currency}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(balance, currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No accounts yet</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total Transferred</span>
              <span className="text-sm font-semibold text-emerald-600">
                {formatCurrency(summary?.totalTransferred ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Executions */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Recent Executions</h3>
            </div>
            <a href="/executions" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </a>
          </div>

          {summary?.recentExecutions?.length ? (
            <div className="space-y-2">
              {summary.recentExecutions.slice(0, 5).map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      exec.type === 'pooling' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {exec.type === 'pooling' ? 'P' : 'S'}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 capitalize">{exec.type}</p>
                      <p className="text-xs text-gray-400">
                        {exec.timestamp?.seconds
                          ? format(new Date(exec.timestamp.seconds * 1000), 'MMM d, HH:mm')
                          : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">
                      {formatCurrency(exec.amount)}
                    </p>
                    <StatusBadge status={exec.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              No executions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
