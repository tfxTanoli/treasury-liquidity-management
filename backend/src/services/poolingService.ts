import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export const executePooling = async (poolId: string, executedBy: string): Promise<any> => {
  // Fetch pool
  const poolDoc = await db.collection('pools').doc(poolId).get();
  if (!poolDoc.exists) throw new Error('Pool not found');
  const pool = poolDoc.data()!;

  // Fetch all pool accounts
  const poolAccSnapshot = await db
    .collection('poolAccounts')
    .where('poolId', '==', poolId)
    .get();

  if (poolAccSnapshot.empty) throw new Error('Pool has no accounts');

  const childAccounts = poolAccSnapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter((pa: any) => pa.role === 'child');

  if (childAccounts.length === 0) throw new Error('Pool has no child accounts');

  const executions: any[] = [];
  let totalTransferred = 0;

  await db.runTransaction(async (transaction) => {
    // ── PHASE 1: ALL READS ──────────────────────────────────────────────────
    const headerRef = db.collection('accounts').doc(pool.headerAccountId);
    const childRefs = childAccounts.map((pa: any) =>
      db.collection('accounts').doc(pa.accountId)
    );

    const [headerDoc, ...childDocs] = await Promise.all([
      transaction.get(headerRef),
      ...childRefs.map(ref => transaction.get(ref)),
    ]);

    if (!headerDoc.exists) throw new Error('Header account not found');

    // ── PHASE 2: COMPUTE ────────────────────────────────────────────────────
    let headerBalance = headerDoc.data()!.balance as number;

    const updates: Array<{ ref: FirebaseFirestore.DocumentReference; newBalance: number }> = [];

    for (let i = 0; i < childAccounts.length; i++) {
      const childDoc = childDocs[i];
      if (!childDoc.exists) continue;

      const childData = childDoc.data()!;
      if (childData.status !== 'active') continue;

      const transferAmount = childData.balance as number;
      if (transferAmount <= 0) continue;

      headerBalance += transferAmount;
      totalTransferred += transferAmount;
      updates.push({ ref: childRefs[i], newBalance: 0 });

      executions.push({
        poolId,
        type: 'pooling',
        sourceAccountId: childAccounts[i].accountId,
        targetAccountId: pool.headerAccountId,
        amount: transferAmount,
        status: 'completed',
        executedBy,
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    // ── PHASE 3: ALL WRITES ─────────────────────────────────────────────────
    for (const { ref, newBalance } of updates) {
      transaction.update(ref, { balance: newBalance });
    }
    transaction.update(headerRef, { balance: headerBalance });
  });

  // Write execution records
  const executionRefs = await Promise.all(
    executions.map(exec => {
      const ref = db.collection('executions').doc();
      return ref.set(exec).then(() => ({ id: ref.id, ...exec }));
    })
  );

  return {
    poolId,
    totalTransferred,
    transactionCount: executions.length,
    executions: executionRefs,
  };
};
