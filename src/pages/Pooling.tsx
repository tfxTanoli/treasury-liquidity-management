import { useEffect, useState } from 'react';
import { poolsApi } from '../api/pools';
import type { Pool } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Play, AlertCircle, CheckCircle2, ArrowDownCircle } from 'lucide-react';

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function Pooling() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executing, setExecuting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const load = async () => {
    try {
      setLoading(true);
      const data = await poolsApi.getAll();
      setPools(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load pools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const executePool = async (pool: Pool) => {
    if (!confirm(`Execute pooling for "${pool.name}"? This will move all child account balances to the header account.`)) return;
    setExecuting(pool.id);
    setResults(prev => ({ ...prev, [pool.id]: null }));
    try {
      const result = await poolsApi.execute(pool.id);
      setResults(prev => ({ ...prev, [pool.id]: { success: true, data: result } }));
      load(); // Refresh balances
    } catch (e: any) {
      setResults(prev => ({
        ...prev,
        [pool.id]: { success: false, error: e.response?.data?.error || 'Execution failed' },
      }));
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Execute pooling to consolidate balances into header accounts</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : pools.length === 0 ? (
        <div className="card p-12 text-center text-sm text-gray-400">
          No pools configured. Create a pool in Liquidity Structures first.
        </div>
      ) : (
        <div className="grid gap-4">
          {pools.map(pool => {
            const result = results[pool.id];
            const childAccounts = (pool.poolAccounts || [])
              .filter((pa: any) => pa.role === 'child');
            const accounts = pool.accounts || [];
            const headerAcc = accounts.find((a: any) => a.id === pool.headerAccountId);
            const childAccDetails = childAccounts
              .map((pa: any) => accounts.find((a: any) => a.id === pa.accountId))
              .filter(Boolean);

            const totalChildBalance = childAccDetails.reduce((s: number, a: any) => s + (a.balance || 0), 0);

            return (
              <div key={pool.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pool.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {childAccounts.length} child account{childAccounts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => executePool(pool)}
                    disabled={executing === pool.id || childAccounts.length === 0}
                    className="btn-primary"
                  >
                    {executing === pool.id ? (
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Play size={14} />
                    )}
                    {executing === pool.id ? 'Executing...' : 'Execute Pooling'}
                  </button>
                </div>

                {/* Flow diagram */}
                <div className="grid grid-cols-3 gap-3 items-center">
                  {/* Child accounts */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Child Accounts</p>
                    {childAccDetails.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">None</p>
                    ) : (
                      childAccDetails.map((a: any) => (
                        <div key={a.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-xs font-medium text-gray-700 truncate">{a.name}</p>
                          <p className="text-xs text-gray-500">{a.currency} {a.balance?.toLocaleString()}</p>
                        </div>
                      ))
                    )}
                    <div className="bg-blue-50 rounded-lg px-2.5 py-1.5 border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium">
                        Total: {formatCurrency(totalChildBalance, headerAcc?.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex flex-col items-center gap-1 text-blue-400">
                    <ArrowDownCircle size={24} className="rotate-[-90deg]" />
                    <p className="text-xs text-gray-400">Sweep to header</p>
                  </div>

                  {/* Header account */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Header Account</p>
                    {headerAcc ? (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                        <p className="text-sm font-semibold text-gray-900">{headerAcc.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{headerAcc.number}</p>
                        <p className="text-sm font-bold text-purple-700 mt-2">
                          {formatCurrency(headerAcc.balance, headerAcc.currency)}
                        </p>
                        <StatusBadge status={headerAcc.status} />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Header not found</p>
                    )}
                  </div>
                </div>

                {/* Result banner */}
                {result && (
                  <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                    result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {result.success ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                    <div>
                      {result.success ? (
                        <>
                          <p className="font-medium">Pooling executed successfully</p>
                          <p className="text-xs mt-0.5">
                            Transferred {formatCurrency(result.data.totalTransferred)} across {result.data.transactionCount} account{result.data.transactionCount !== 1 ? 's' : ''}
                          </p>
                        </>
                      ) : (
                        <p>{result.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
