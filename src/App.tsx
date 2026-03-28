import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthStore } from './store/authStore';
import { useRoleStore } from './store/roleStore';
import { usersApi } from './api/users';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import LiquidityStructures from './pages/LiquidityStructures';
import Pooling from './pages/Pooling';
import SweepingRules from './pages/SweepingRules';
import Approvals from './pages/Approvals';
import ExecutionHistory from './pages/ExecutionHistory';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { setProfile, setProfileLoading } = useRoleStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        try {
          const profile = await usersApi.getMe();
          setProfile(profile);
        } catch {
          // Backend unavailable or user profile missing — fall back to token claims,
          // then 'viewer' so the sidebar doesn't collapse to Settings-only.
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            const claimedRole = tokenResult.claims['role'] as string | undefined;
            const role = (['admin', 'treasury_manager', 'approver', 'viewer'].includes(claimedRole ?? ''))
              ? (claimedRole as import('./types').Role)
              : 'viewer';
            setProfile({ uid: firebaseUser.uid, email: firebaseUser.email ?? '', role });
          } catch {
            setProfile({ uid: firebaseUser.uid, email: firebaseUser.email ?? '', role: 'viewer' });
          }
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return unsub;
  }, [setUser, setLoading, setProfile, setProfileLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Loading TreasuryOS...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          element={user ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/liquidity-structures" element={<LiquidityStructures />} />
          <Route path="/pooling" element={<Pooling />} />
          <Route path="/sweeping-rules" element={<SweepingRules />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/executions" element={<ExecutionHistory />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
