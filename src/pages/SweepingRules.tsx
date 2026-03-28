import { useEffect, useState } from 'react';
import { rulesApi } from '../api/rules';
import { accountsApi } from '../api/accounts';
import type { SweepRule, Account } from '../types';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { usePermission } from '../hooks/usePermission';
import {
  Plus, Play, Pause, Send, CheckCircle, Copy,
  AlertCircle, Pencil
} from 'lucide-react';

const RULE_TYPES = [
  { value: 'zero', label: 'Zero Balance', desc: 'Transfer full balance to target' },
  { value: 'target', label: 'Target Balance', desc: 'Maintain specific balance in source' },
  { value: 'threshold', label: 'Threshold', desc: 'Transfer when balance exceeds threshold' },
  { value: 'deficit', label: 'Deficit Funding', desc: 'Fund source from target when below target' },
];

const emptyForm = {
  name: '',
  type: 'zero' as SweepRule['type'],
  sourceAccountId: '',
  targetAccountId: '',
  thresholdValue: '',
  targetBalance: '',
};

export default function SweepingRules() {
  const [rules, setRules] = useState<SweepRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<SweepRule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResults, setExecResults] = useState<Record<string, any>>({});
  const [filterStatus, setFilterStatus] = useState('all');

  const canWrite = usePermission('rules_write');
  const canSubmit = usePermission('rules_submit');
  const canActivate = usePermission('rules_activate');
  const canPause = usePermission('rules_pause');
  const canExecute = usePermission('sweeping_execute');

  const load = async () => {
    try {
      setLoading(true);
      const [r, a] = await Promise.all([rulesApi.getAll(), accountsApi.getAll()]);
      setRules(r);
      setAccounts(a);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditRule(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (rule: SweepRule) => {
    setEditRule(rule);
    setForm({
      name: rule.name,
      type: rule.type,
      sourceAccountId: rule.sourceAccountId,
      targetAccountId: rule.targetAccountId,
      thresholdValue: rule.thresholdValue != null ? String(rule.thresholdValue) : '',
      targetBalance: rule.targetBalance != null ? String(rule.targetBalance) : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload: any = {
        name: form.name,
        type: form.type,
        sourceAccountId: form.sourceAccountId,
        targetAccountId: form.targetAccountId,
      };
      if (form.thresholdValue) payload.thresholdValue = parseFloat(form.thresholdValue);
      if (form.targetBalance) payload.targetBalance = parseFloat(form.targetBalance);

      if (editRule) {
        await rulesApi.update(editRule.id, payload);
      } else {
        await rulesApi.create(payload);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: string, ruleId: string) => {
    try {
      switch (action) {
        case 'submit': await rulesApi.submit(ruleId); break;
        case 'activate': await rulesApi.activate(ruleId); break;
        case 'pause': await rulesApi.pause(ruleId); break;
        case 'clone': await rulesApi.clone(ruleId); break;
      }
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || `Failed to ${action} rule`);
    }
  };

  const executeRule = async (rule: SweepRule) => {
    if (!confirm(`Execute sweep rule "${rule.name}"?`)) return;
    setExecuting(rule.id);
    try {
      const result = await rulesApi.execute(rule.id);
      setExecResults(prev => ({ ...prev, [rule.id]: { success: true, data: result } }));
      load();
    } catch (e: any) {
      setExecResults(prev => ({
        ...prev,
        [rule.id]: { success: false, error: e.response?.data?.error || 'Execution failed' },
      }));
    } finally {
      setExecuting(null);
    }
  };

  const getAccount = (id: string) => accounts.find(a => a.id === id);

  const filtered = filterStatus === 'all' ? rules : rules.filter(r => r.status === filterStatus);

  const needsThreshold = (type: string) => type === 'threshold';
  const needsTarget = (type: string) => type === 'target' || type === 'deficit';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['all', 'draft', 'pending', 'approved', 'active', 'paused', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {canWrite && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={14} /> New Rule
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400">✕</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Rule Name', 'Type', 'Source', 'Target', 'Parameters', 'Status', 'Actions'].map(h => (
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
                No sweep rules found
              </td></tr>
            ) : (
              filtered.map(rule => {
                const src = getAccount(rule.sourceAccountId);
                const tgt = getAccount(rule.targetAccountId);
                const execResult = execResults[rule.id];

                return (
                  <>
                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                        <p className="text-xs text-gray-400">by {rule.createdBy?.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-200 capitalize">
                          {RULE_TYPES.find(t => t.value === rule.type)?.label || rule.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">{src?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{src?.number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">{tgt?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{tgt?.number}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {rule.type === 'threshold' && rule.thresholdValue != null && (
                          <span>Threshold: {rule.thresholdValue.toLocaleString()}</span>
                        )}
                        {(rule.type === 'target' || rule.type === 'deficit') && rule.targetBalance != null && (
                          <span>Target: {rule.targetBalance.toLocaleString()}</span>
                        )}
                        {rule.type === 'zero' && <span>Full balance</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={rule.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {canWrite && (rule.status === 'draft' || rule.status === 'paused') && (
                            <button onClick={() => openEdit(rule)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                              <Pencil size={13} />
                            </button>
                          )}
                          {canSubmit && rule.status === 'draft' && (
                            <button onClick={() => handleAction('submit', rule.id)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Submit for Approval">
                              <Send size={13} />
                            </button>
                          )}
                          {canActivate && rule.status === 'approved' && (
                            <button onClick={() => handleAction('activate', rule.id)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Activate">
                              <CheckCircle size={13} />
                            </button>
                          )}
                          {rule.status === 'active' && (
                            <>
                              {canExecute && <button
                                onClick={() => executeRule(rule)}
                                disabled={executing === rule.id}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Execute"
                              >
                                {executing === rule.id ? (
                                  <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full" />
                                ) : <Play size={13} />}
                              </button>}
                              {canPause && <button onClick={() => handleAction('pause', rule.id)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Pause">
                                <Pause size={13} />
                              </button>}
                            </>
                          )}
                          {canWrite && <button onClick={() => handleAction('clone', rule.id)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Clone">
                            <Copy size={13} />
                          </button>}
                        </div>
                      </td>
                    </tr>
                    {execResult && (
                      <tr key={`${rule.id}-result`}>
                        <td colSpan={7} className="px-4 pb-3">
                          <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                            execResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {execResult.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                            {execResult.success
                              ? `Executed: transferred ${execResult.data.amount?.toLocaleString()} (${execResult.data.status})`
                              : execResult.error}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rule Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editRule ? 'Edit Rule' : 'Create Sweep Rule'} size="lg">
        <div className="space-y-4">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={13} /> {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Rule Name</label>
              <input className="input" placeholder="Daily Zero Balance Sweep" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Rule Type</label>
              <div className="grid grid-cols-2 gap-2">
                {RULE_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value as any })}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      form.type === t.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Source Account</label>
              <select className="input" value={form.sourceAccountId}
                onChange={e => setForm({ ...form, sourceAccountId: e.target.value })}>
                <option value="">Select source...</option>
                {accounts.filter(a => a.status === 'active').map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Target Account</label>
              <select className="input" value={form.targetAccountId}
                onChange={e => setForm({ ...form, targetAccountId: e.target.value })}>
                <option value="">Select target...</option>
                {accounts.filter(a => a.status === 'active' && a.id !== form.sourceAccountId).map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>
            {needsThreshold(form.type) && (
              <div>
                <label className="label">Threshold Value</label>
                <input type="number" className="input" placeholder="10000" value={form.thresholdValue}
                  onChange={e => setForm({ ...form, thresholdValue: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">Transfer amount above this value</p>
              </div>
            )}
            {needsTarget(form.type) && (
              <div>
                <label className="label">Target Balance</label>
                <input type="number" className="input" placeholder="5000" value={form.targetBalance}
                  onChange={e => setForm({ ...form, targetBalance: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">
                  {form.type === 'deficit' ? 'Minimum balance to maintain in source' : 'Balance to maintain in source after sweep'}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.sourceAccountId || !form.targetAccountId}
              className="btn-primary"
            >
              {saving ? 'Saving...' : editRule ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
