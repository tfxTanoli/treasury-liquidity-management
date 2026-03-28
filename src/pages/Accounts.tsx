import { useEffect, useState } from 'react';
import { accountsApi } from '../api/accounts';
import type { Account } from '../types';
import { usePermission } from '../hooks/usePermission';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Search, Pencil, Power, AlertCircle } from 'lucide-react';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'HKD', 'CHF'];
const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Latin America', 'Africa'];

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const emptyForm = {
  name: '',
  number: '',
  currency: 'USD',
  balance: '',
  region: 'North America',
  status: 'active' as const,
  isHeaderAllowed: false,
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<{
    name: string; number: string; currency: string;
    balance: string; region: string;
    status: 'active' | 'inactive'; isHeaderAllowed: boolean;
  }>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const canWrite = usePermission('accounts_write');

  const load = async () => {
    try {
      setLoading(true);
      const data = await accountsApi.getAll();
      setAccounts(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditAccount(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (account: Account) => {
    setEditAccount(account);
    setForm({
      name: account.name,
      number: account.number,
      currency: account.currency,
      balance: String(account.balance),
      region: account.region,
      status: account.status,
      isHeaderAllowed: account.isHeaderAllowed,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      if (editAccount) {
        await accountsApi.update(editAccount.id, {
          name: form.name,
          number: form.number,
          currency: form.currency,
          region: form.region,
          isHeaderAllowed: form.isHeaderAllowed,
        });
      } else {
        await accountsApi.create({
          name: form.name,
          number: form.number,
          currency: form.currency,
          balance: parseFloat(form.balance) || 0,
          region: form.region,
          status: form.status,
          isHeaderAllowed: form.isHeaderAllowed,
        });
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (account: Account) => {
    try {
      const newStatus = account.status === 'active' ? 'inactive' : 'active';
      await accountsApi.updateStatus(account.id, newStatus);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update status');
    }
  };

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.number.toLowerCase().includes(search.toLowerCase()) ||
    a.currency.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-9 w-64"
            placeholder="Search accounts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {canWrite && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={14} /> Add Account
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Account Name', 'Number', 'Currency', 'Balance', 'Region', 'Header Allowed', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                  <div className="flex justify-center">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                  {search ? 'No accounts match your search' : 'No accounts yet. Create one to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map(account => (
                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{account.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{account.number}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-200">{account.currency}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(account.balance, account.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{account.region}</td>
                  <td className="px-4 py-3">
                    {account.isHeaderAllowed ? (
                      <span className="badge bg-purple-50 text-purple-700 ring-1 ring-purple-200">Yes</span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-500 ring-1 ring-gray-200">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={account.status} />
                  </td>
                  <td className="px-4 py-3">
                    {canWrite ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(account)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleStatus(account)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            account.status === 'active'
                              ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={account.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">View only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editAccount ? 'Edit Account' : 'Create Account'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
              <AlertCircle size={14} /> {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Account Name</label>
              <input
                className="input"
                placeholder="Main Operating Account"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input
                className="input"
                placeholder="ACC-001"
                value={form.number}
                onChange={e => setForm({ ...form, number: e.target.value })}
                disabled={!!editAccount}
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                className="input"
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {!editAccount && (
              <div>
                <label className="label">Initial Balance</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.balance}
                  onChange={e => setForm({ ...form, balance: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="label">Region</label>
              <select
                className="input"
                value={form.region}
                onChange={e => setForm({ ...form, region: e.target.value })}
              >
                {REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
              checked={form.isHeaderAllowed}
              onChange={e => setForm({ ...form, isHeaderAllowed: e.target.checked })}
            />
            <span className="text-sm text-gray-700">Allow as header account in liquidity pools</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.number}
              className="btn-primary"
            >
              {saving ? 'Saving...' : editAccount ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
