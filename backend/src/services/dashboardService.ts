import { db } from '../config/firebase';

export const getDashboardSummary = async (): Promise<any> => {
  const [
    accountsSnap,
    poolsSnap,
    rulesSnap,
    executionsSnap,
    pendingApprovalsSnap,
  ] = await Promise.all([
    db.collection('accounts').get(),
    db.collection('pools').get(),
    db.collection('sweepRules').get(),
    db.collection('executions').orderBy('timestamp', 'desc').limit(10).get(),
    db.collection('sweepRules').where('status', '==', 'pending').get(),
  ]);

  const accounts = accountsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  const rules = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  // Convert Firestore Timestamps to plain { seconds, nanoseconds } so JSON serializes correctly
  const executions = executionsSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp: data.timestamp
        ? { seconds: data.timestamp.seconds, nanoseconds: data.timestamp.nanoseconds }
        : null,
    };
  }) as any[];

  const totalBalance = accounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  const activeAccounts = accounts.filter((a: any) => a.status === 'active').length;
  const activeRules = rules.filter((r: any) => r.status === 'active').length;

  const completedExecutions = executions.filter((e: any) => e.status === 'completed');
  const totalTransferred = completedExecutions.reduce(
    (sum: number, e: any) => sum + (e.amount || 0),
    0
  );

  // Group balances by currency
  const balanceByCurrency: Record<string, number> = {};
  accounts.forEach((a: any) => {
    if (!balanceByCurrency[a.currency]) balanceByCurrency[a.currency] = 0;
    balanceByCurrency[a.currency] += a.balance || 0;
  });

  return {
    totalAccounts: accounts.length,
    activeAccounts,
    totalPools: poolsSnap.size,
    totalRules: rules.length,
    activeRules,
    pendingApprovals: pendingApprovalsSnap.size,
    totalBalance,
    balanceByCurrency,
    totalTransferred,
    recentExecutions: executions.slice(0, 5),
  };
};
