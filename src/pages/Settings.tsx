import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRoleStore } from '../store/roleStore';
import { auth } from '../lib/firebase';
import {
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { usersApi } from '../api/users';
import { User, Lock, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '../types';

export default function Settings() {
  const { user } = useAuthStore();
  const { role, profile, setProfile } = useRoleStore();

  // Profile form
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile(user!, { displayName: displayName.trim() });
      // Update in Firestore via backend
      const updated = await usersApi.updateDisplayName(displayName.trim());
      setProfile(updated);
      setProfileMsg({ type: 'success', text: 'Name updated successfully' });
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update name' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      // Re-authenticate first (required by Firebase before sensitive operations)
      const credential = EmailAuthProvider.credential(user!.email!, currentPassword);
      await reauthenticateWithCredential(user!, credential);
      await updatePassword(user!, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/wrong-password': 'Current password is incorrect',
        'auth/invalid-credential': 'Current password is incorrect',
        'auth/too-many-requests': 'Too many attempts. Try again later',
      };
      setPasswordMsg({ type: 'error', text: msgs[err.code] || 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">

      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
        </div>

        {/* Read-only fields */}
        <div className="space-y-3 mb-5">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-gray-900">{user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Role</p>
            {role ? (
              <span className={`badge ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
            ) : <p className="text-sm text-gray-400">—</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Member since</p>
            <p className="text-sm text-gray-600">
              {user?.metadata.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>

        {/* Editable name */}
        <form onSubmit={handleSaveProfile} className="space-y-3 border-t border-gray-100 pt-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          {profileMsg && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              profileMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {profileMsg.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {profileMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile || !displayName.trim()}
              className="btn-primary"
            >
              {savingProfile ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>
          {passwordMsg && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {passwordMsg.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {passwordMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary"
            >
              {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Sign Out */}
      <button
        onClick={() => signOut(auth)}
        className="btn-danger w-full justify-center"
      >
        <LogOut size={14} /> Sign Out
      </button>
    </div>
  );
}
