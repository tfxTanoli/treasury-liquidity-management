import { useEffect, useState } from 'react';
import { poolsApi } from '../api/pools';
import { accountsApi } from '../api/accounts';
import type { Pool, Account } from '../types';
import { usePermission } from '../hooks/usePermission';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Users, Trash2, AlertCircle, ChevronRight } from 'lucide-react';

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function LiquidityStructures() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [poolForm, setPoolForm] = useState({ name: '', headerAccountId: '' });
  const [addAccountId, setAddAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const canWrite = usePermission('pools_write');

  const load = async () => {
    try {
      setLoading(true);
      const [p, a] = await Promise.all([poolsApi.getAll(), accountsApi.getAll()]);
      setPools(p);
      setAccounts(a);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createPool = async () => {
    setSaving(true);
    setFormError('');
    try {
      await poolsApi.create(poolForm);
      setShowCreateModal(false);
      setPoolForm({ name: '', headerAccountId: '' });
      load();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Failed to create pool');
    } finally {
      setSaving(false);
    }
  };

  const addAccount = async () => {
    if (!selectedPool || !addAccountId) return;
    setSaving(true);
    setFormError('');
    try {
      await poolsApi.addAccount(selectedPool.id, addAccountId);
      setShowAddAccountModal(false);
      setAddAccountId('');
      load();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Failed to add account');
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async (poolId: string, accountId: string) => {
    if (!confirm('Remove this account from the pool?')) return;
    try {
      await poolsApi.removeAccount(poolId, accountId);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to remove account');
    }
  };

  const headerAccounts = accounts.filter(a => a.isHeaderAllowed && a.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{pools.length} pool{pools.length !== 1 ? 's' : ''}</p>
        {canWrite && (
          <button onClick={() => { setPoolForm({ name: '', headerAccountId: '' }); setFormError(''); setShowCreateModal(true); }} className="btn-primary">
            <Plus size={14} /> Create Pool
          </button>
        )}
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
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users size={20} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No liquidity pools yet</p>
          <p className="text-gray-400 text-xs mt-1">Create a pool to start managing liquidity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pools.map(pool => {
            const isExpanded = expanded.has(pool.id);
            const headerAcc = accounts.find(a => a.id === pool.headerAccountId);
            const childAccounts = (pool.poolAccounts || [])
              .filter((pa: any) => pa.role === 'child')
              .map((pa: any) => accounts.find(a => a.id === pa.accountId))
              .filter(Boolean) as Account[];

            const totalChildBalance = childAccounts.reduce((s, a) => s + (a.balance || 0), 0);

            return (
              <div key={pool.id} className="card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(pool.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{pool.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Header: {headerAcc?.name || pool.headerAccountId} •{' '}
                        {childAccounts.length} child account{childAccounts.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Child Balances</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(totalChildBalance, headerAcc?.currency)}
                      </p>
                    </div>
                    {canWrite && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedPool(pool);
                          setAddAccountId('');
                          setFormError('');
                          setShowAddAccountModal(true);
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        <Plus size={12} /> Add Account
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Header Account */}
                    {headerAcc && (
                      <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StatusBadge status="header" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{headerAcc.name}</p>
                            <p className="text-xs text-gray-500">{headerAcc.number} • {headerAcc.currency}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(headerAcc.balance, headerAcc.currency)}
                        </p>
                      </div>
                    )}

                    {/* Child Accounts */}
                    {childAccounts.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No child accounts yet</p>
                    ) : (
                      childAccounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-3 pl-6">
                            <div className="w-px h-6 bg-gray-200 -ml-4" />
                            <StatusBadge status="child" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{account.name}</p>
                              <p className="text-xs text-gray-500">{account.number} • {account.currency}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(account.balance, account.currency)}
                            </p>
                            <StatusBadge status={account.status} />
                            {canWrite && (
                              <button
                                onClick={() => removeAccount(pool.id, account.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Pool Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Liquidity Pool">
        <div className="space-y-4">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={13} /> {formError}
            </div>
          )}
          <div>
            <label className="label">Pool Name</label>
            <input
              className="input"
              placeholder="APAC Liquidity Pool"
              value={poolForm.name}
              onChange={e => setPoolForm({ ...poolForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Header Account</label>
            <select
              className="input"
              value={poolForm.headerAccountId}
              onChange={e => setPoolForm({ ...poolForm, headerAccountId: e.target.value })}
            >
              <option value="">Select header account...</option>
              {headerAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.number})</option>
              ))}
            </select>
            {headerAccounts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No accounts with header permission. Enable "isHeaderAllowed" on an account first.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={createPool}
              disabled={saving || !poolForm.name || !poolForm.headerAccountId}
              className="btn-primary"
            >
              {saving ? 'Creating...' : 'Create Pool'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Account Modal */}
      <Modal isOpen={showAddAccountModal} onClose={() => setShowAddAccountModal(false)} title="Add Account to Pool">
        <div className="space-y-4">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={13} /> {formError}
            </div>
          )}
          <p className="text-sm text-gray-500">Adding account to: <strong>{selectedPool?.name}</strong></p>
          <div>
            <label className="label">Account</label>
            <select
              className="input"
              value={addAccountId}
              onChange={e => setAddAccountId(e.target.value)}
            >
              <option value="">Select account...</option>
              {accounts
                .filter(a => a.status === 'active' && a.id !== selectedPool?.headerAccountId)
                .map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.number}) — {a.currency}</option>
                ))
              }
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddAccountModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={addAccount} disabled={saving || !addAccountId} className="btn-primary">
              {saving ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
