import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface Pool {
  id?: string;
  name: string;
  headerAccountId: string;
  createdAt?: FirebaseFirestore.Timestamp;
}

export interface PoolAccount {
  id?: string;
  poolId: string;
  accountId: string;
  role: 'header' | 'child';
}

export const createPool = async (data: { name: string; headerAccountId: string }): Promise<Pool> => {
  // Validate header account exists and is allowed
  const accountDoc = await db.collection('accounts').doc(data.headerAccountId).get();
  if (!accountDoc.exists) throw new Error('Header account not found');
  const account = accountDoc.data();
  if (!account?.isHeaderAllowed) throw new Error('Account is not allowed as header');
  if (account?.status !== 'active') throw new Error('Header account is not active');

  const poolRef = db.collection('pools').doc();
  const pool: Pool = {
    name: data.name,
    headerAccountId: data.headerAccountId,
    createdAt: FieldValue.serverTimestamp() as any,
  };
  await poolRef.set(pool);

  // Add header account to poolAccounts
  const poolAccountRef = db.collection('poolAccounts').doc();
  await poolAccountRef.set({
    poolId: poolRef.id,
    accountId: data.headerAccountId,
    role: 'header',
  } as PoolAccount);

  return { ...pool, id: poolRef.id };
};

export const getPools = async (): Promise<any[]> => {
  const snapshot = await db.collection('pools').orderBy('createdAt', 'desc').get();
  const pools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Enrich with accounts
  const enriched = await Promise.all(
    pools.map(async (pool: any) => {
      const poolAccSnapshot = await db
        .collection('poolAccounts')
        .where('poolId', '==', pool.id)
        .get();
      const poolAccounts = poolAccSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const accountIds = poolAccounts.map((pa: any) => pa.accountId);
      const accountDocs = await Promise.all(
        accountIds.map(id => db.collection('accounts').doc(id).get())
      );
      const accounts = accountDocs
        .filter(d => d.exists)
        .map(d => ({ id: d.id, ...d.data() }));

      return { ...pool, poolAccounts, accounts };
    })
  );

  return enriched;
};

export const addAccountToPool = async (
  poolId: string,
  accountId: string
): Promise<PoolAccount> => {
  // Validate pool exists
  const poolDoc = await db.collection('pools').doc(poolId).get();
  if (!poolDoc.exists) throw new Error('Pool not found');

  // Validate account exists and is active
  const accountDoc = await db.collection('accounts').doc(accountId).get();
  if (!accountDoc.exists) throw new Error('Account not found');
  if (accountDoc.data()?.status !== 'active') throw new Error('Account is not active');

  // Check not already in pool
  const existing = await db
    .collection('poolAccounts')
    .where('poolId', '==', poolId)
    .where('accountId', '==', accountId)
    .get();
  if (!existing.empty) throw new Error('Account already in this pool');

  const poolAccount: PoolAccount = {
    poolId,
    accountId,
    role: 'child',
  };
  const ref = db.collection('poolAccounts').doc();
  await ref.set(poolAccount);
  return { ...poolAccount, id: ref.id };
};

export const removeAccountFromPool = async (
  poolId: string,
  accountId: string
): Promise<void> => {
  const poolDoc = await db.collection('pools').doc(poolId).get();
  if (!poolDoc.exists) throw new Error('Pool not found');

  // Cannot remove header
  const pool = poolDoc.data();
  if (pool?.headerAccountId === accountId) {
    throw new Error('Cannot remove header account from pool');
  }

  const snapshot = await db
    .collection('poolAccounts')
    .where('poolId', '==', poolId)
    .where('accountId', '==', accountId)
    .get();

  if (snapshot.empty) throw new Error('Account not found in pool');

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};
