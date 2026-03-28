import { useEffect, useState } from 'react';
import { approvalsApi } from '../api/approvals';
import { rulesApi } from '../api/rules';
import { accountsApi } from '../api/accounts';
import type { SweepRule, Account } from '../types';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

export default function Approvals() {
  const [pendingRules, setPendingRules] = useState<SweepRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<SweepRule | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [rules, accs] = await Promise.all([rulesApi.getAll(), accountsApi.getAll()]);
      setPendingRules(rules.filter(r => r.status === 'pending'));
      setAccounts(accs);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAction = (rule: SweepRule, act: 'approve' | 'reject') => {
    setSelectedRule(rule);
    setAction(act);
    setComment('');
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!selectedRule) return;
    setSaving(true);
    try {
      if (action === 'approve') {
        await approvalsApi.approve(selectedRule.id, comment);
      } else {
        await approvalsApi.reject(selectedRule.id, comment);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to process approval');
    } finally {
      setSaving(false);
    }
  };

  const getAccount = (id: string) => accounts.find(a => a.id === id);

  const RULE_TYPE_LABELS: Record<string, string> = {
    zero: 'Zero Balance',
    target: 'Target Balance',
    threshold: 'Threshold',
    deficit: 'Deficit Funding',
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError('')} className="ml-auto">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : pendingRules.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <p className="text-gray-500 text-sm font-medium">All clear!</p>
          <p className="text-gray-400 text-xs mt-1">No rules pending approval</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg">
            <Clock size={14} className="text-amber-600" />
            <p className="text-sm text-amber-700 font-medium">
              {pendingRules.length} rule{pendingRules.length !== 1 ? 's' : ''} pending approval
            </p>
          </div>

          <div className="space-y-3">
            {pendingRules.map(rule => {
              const src = getAccount(rule.sourceAccountId);
              const tgt = getAccount(rule.targetAccountId);

              return (
                <div key={rule.id} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                        <StatusBadge status={rule.status} />
                        <span className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                          {RULE_TYPE_LABELS[rule.type] || rule.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Created by: {rule.createdBy}</p>

                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase mb-1">Source Account</p>
                          <p className="text-sm font-medium text-gray-900">{src?.name || '—'}</p>
                          <p className="text-xs text-gray-500">{src?.number} • {src?.currency}</p>
                          {src && <p className="text-xs font-semibold text-gray-700 mt-0.5">
                            Balance: {src.balance?.toLocaleString()} {src.currency}
                          </p>}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase mb-1">Target Account</p>
                          <p className="text-sm font-medium text-gray-900">{tgt?.name || '—'}</p>
                          <p className="text-xs text-gray-500">{tgt?.number} • {tgt?.currency}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase mb-1">Parameters</p>
                          {rule.type === 'zero' && <p className="text-xs text-gray-600">Transfer full balance</p>}
                          {rule.thresholdValue != null && (
                            <p className="text-xs text-gray-600">Threshold: {rule.thresholdValue.toLocaleString()}</p>
                          )}
                          {rule.targetBalance != null && (
                            <p className="text-xs text-gray-600">Target: {rule.targetBalance.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => openAction(rule, 'reject')}
                        className="btn-danger px-3 py-1.5 text-xs"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                      <button
                        onClick={() => openAction(rule, 'approve')}
                        className="btn-success px-3 py-1.5 text-xs"
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Approve/Reject Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={action === 'approve' ? 'Approve Rule' : 'Reject Rule'}
        size="sm"
      >
        <div className="space-y-4">
          <div className={`p-3 rounded-lg ${
            action === 'approve' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            <p className="text-sm font-medium">
              {action === 'approve' ? 'Approve' : 'Reject'}: {selectedRule?.name}
            </p>
          </div>

          {action === 'reject' && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Rejecting will move this rule back to draft status. The creator can edit and resubmit.
            </p>
          )}

          <div>
            <label className="label">Comment {action === 'reject' ? '(recommended)' : '(optional)'}</label>
            <textarea
              className="input h-20 resize-none"
              placeholder={action === 'approve' ? 'Looks good...' : 'Reason for rejection...'}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleAction}
              disabled={saving}
              className={action === 'approve' ? 'btn-success' : 'btn-danger'}
            >
              {saving ? 'Processing...' : action === 'approve' ? 'Approve Rule' : 'Reject Rule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
