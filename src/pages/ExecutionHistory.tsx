import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard';
import { accountsApi } from '../api/accounts';
import type { Execution, Account } from '../types';
import StatusBadge from '../components/StatusBadge';
import { AlertCircle, RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function ExecutionHistory() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = async () => {
    try {
      setLoading(true);
      const [execs, accs] = await Promise.all([
        dashboardApi.getExecutions({ limit: 200 }),
        accountsApi.getAll(),
      ]);
      setExecutions(execs);
      setAccounts(accs);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getAccount = (id: string) => accounts.find(a => a.id === id);

  const filtered = executions.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  });

  const completedTotal = filtered
    .filter(e => e.status === 'completed')
    .reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select className="input w-auto text-xs"
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="pooling">Pooling</option>
            <option value="sweeping">Sweeping</option>
          </select>
          <select className="input w-auto text-xs"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Transferred</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(completedTotal)}</p>
          </div>
          <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Time', 'Type', 'Source', 'Target', 'Amount', 'Status', 'Note'].map(h => (
                <th key={h} className="text-left px-4 py-3 table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12">
                <div className="flex justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                No executions found
              </td></tr>
            ) : (
              filtered.map(exec => {
                const src = getAccount(exec.sourceAccountId);
                const tgt = getAccount(exec.targetAccountId);

                return (
                  <tr key={exec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {exec.timestamp?.seconds
                        ? format(new Date(exec.timestamp.seconds * 1000), 'MMM d, yyyy HH:mm:ss')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        exec.type === 'pooling'
                          ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                      } capitalize`}>
                        {exec.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-700">{src?.name || exec.sourceAccountId.slice(0, 8) + '...'}</p>
                      <p className="text-xs text-gray-400">{src?.number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-700">{tgt?.name || exec.targetAccountId.slice(0, 8) + '...'}</p>
                      <p className="text-xs text-gray-400">{tgt?.number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${
                        exec.status === 'completed' ? 'text-emerald-700' : 'text-gray-400'
                      }`}>
                        {exec.status === 'completed' ? formatCurrency(exec.amount) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="px-4 py-3">
                      {exec.failureReason && (
                        <p className="text-xs text-red-500 max-w-xs truncate" title={exec.failureReason}>
                          {exec.failureReason}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} records</p>
      )}
    </div>
  );
}
