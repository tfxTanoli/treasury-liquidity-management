import { useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import type { UserProfile, Role } from '../types';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { usePermission } from '../hooks/usePermission';
import Modal from '../components/Modal';
import { Plus, Pencil, Power, AlertCircle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';

const ROLES: Role[] = ['admin', 'treasury_manager', 'approver', 'viewer'];

export default function UserManagement() {
  const canWrite = usePermission('users_write');
  const canRead = usePermission('users_read');
  const { user: me } = useAuthStore();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const [createForm, setCreateForm] = useState({ email: '', password: '', displayName: '', role: 'viewer' as Role });
  const [newRole, setNewRole] = useState<Role>('viewer');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead]);

  const handleCreate = async () => {
    setSaving(true);
    setFormError('');
    try {
      await usersApi.create(createForm);
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', displayName: '', role: 'viewer' });
      load();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const openRoleModal = (user: UserProfile) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setFormError('');
    setShowRoleModal(true);
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setFormError('');
    try {
      await usersApi.updateRole(selectedUser.uid, newRole);
      setShowRoleModal(false);
      load();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const toggleDisabled = async (user: UserProfile) => {
    if (user.uid === me?.uid) return;
    if (!confirm(`${user.disabled ? 'Enable' : 'Disable'} user "${user.email}"?`)) return;
    try {
      await usersApi.setDisabled(user.uid, !user.disabled);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update user');
    }
  };

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={32} className="text-gray-300" />
        <p className="text-gray-500 text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        {canWrite && (
          <button
            onClick={() => { setCreateForm({ email: '', password: '', displayName: '', role: 'viewer' }); setFormError(''); setShowCreateModal(true); }}
            className="btn-primary"
          >
            <Plus size={14} /> Invite User
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError('')} className="ml-auto">✕</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['User', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12">
                <div className="flex justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm text-gray-400">No users found</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.uid} className={`hover:bg-gray-50 transition-colors ${user.disabled ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-600">
                          {(user.displayName || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.displayName || '—'}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      {user.uid === me?.uid && (
                        <span className="badge bg-blue-50 text-blue-600 ring-1 ring-blue-200 text-xs">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.disabled
                      ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                      {user.disabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.createdAt?.seconds
                      ? format(new Date(user.createdAt.seconds * 1000), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Change Role"
                        >
                          <Pencil size={13} />
                        </button>
                        {user.uid !== me?.uid && (
                          <button
                            onClick={() => toggleDisabled(user)}
                            className={`p-1.5 rounded transition-colors ${
                              user.disabled
                                ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={user.disabled ? 'Enable user' : 'Disable user'}
                          >
                            <Power size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Invite User">
        <div className="space-y-4">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={13} /> {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input className="input" placeholder="Jane Smith" value={createForm.displayName}
                onChange={e => setCreateForm({ ...createForm, displayName: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="jane@company.com" value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Temporary Password</label>
              <input type="password" className="input" placeholder="Min 6 characters" value={createForm.password}
                onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button key={r} type="button"
                    onClick={() => setCreateForm({ ...createForm, role: r })}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      createForm.role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[r]}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || !createForm.email || !createForm.password || !createForm.displayName}
              className="btn-primary"
            >
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title="Change Role" size="sm">
        <div className="space-y-4">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={13} /> {formError}
            </div>
          )}
          <p className="text-sm text-gray-600">
            Changing role for: <strong>{selectedUser?.displayName || selectedUser?.email}</strong>
          </p>
          <div className="space-y-2">
            {ROLES.map(r => (
              <button key={r} type="button"
                onClick={() => setNewRole(r)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  newRole === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[r]}</p>
                  {newRole === r && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowRoleModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleRoleUpdate} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Update Role'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
