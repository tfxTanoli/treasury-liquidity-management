import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface Account {
  id?: string;
  name: string;
  number: string;
  currency: string;
  balance: number;
  region: string;
  status: 'active' | 'inactive';
  isHeaderAllowed: boolean;
  createdAt?: FirebaseFirestore.Timestamp;
}

export const createAccount = async (data: Omit<Account, 'id' | 'createdAt'>): Promise<Account> => {
  // Check for duplicate account number
  const existing = await db.collection('accounts').where('number', '==', data.number).get();
  if (!existing.empty) {
    throw new Error(`Account number ${data.number} already exists`);
  }

  const docRef = db.collection('accounts').doc();
  const account: Account = {
    ...data,
    balance: Number(data.balance) || 0,
    status: data.status || 'active',
    isHeaderAllowed: Boolean(data.isHeaderAllowed),
    createdAt: FieldValue.serverTimestamp() as any,
  };
  await docRef.set(account);
  return { ...account, id: docRef.id };
};

export const getAccounts = async (): Promise<Account[]> => {
  const snapshot = await db.collection('accounts').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
};

export const getAccountById = async (id: string): Promise<Account | null> => {
  const doc = await db.collection('accounts').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Account;
};

export const updateAccount = async (id: string, data: Partial<Account>): Promise<Account> => {
  const ref = db.collection('accounts').doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Account not found');

  // Disallow direct balance update via this method
  const { balance, id: _id, createdAt, ...safeData } = data as any;
  await ref.update(safeData);
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as Account;
};

export const updateAccountStatus = async (id: string, status: 'active' | 'inactive'): Promise<Account> => {
  const ref = db.collection('accounts').doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Account not found');
  await ref.update({ status });
  return { id, ...doc.data(), status } as Account;
};
