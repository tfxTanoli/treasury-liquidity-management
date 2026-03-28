import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export type RuleType = 'zero' | 'target' | 'threshold' | 'deficit';
export type RuleStatus = 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'rejected';

export interface SweepRule {
  id?: string;
  name: string;
  type: RuleType;
  sourceAccountId: string;
  targetAccountId: string;
  thresholdValue?: number;
  targetBalance?: number;
  status: RuleStatus;
  createdBy: string;
  createdAt?: FirebaseFirestore.Timestamp;
}

export const createRule = async (
  data: Omit<SweepRule, 'id' | 'status' | 'createdAt'>
): Promise<SweepRule> => {
  // Validate accounts exist
  const [sourceDoc, targetDoc] = await Promise.all([
    db.collection('accounts').doc(data.sourceAccountId).get(),
    db.collection('accounts').doc(data.targetAccountId).get(),
  ]);

  if (!sourceDoc.exists) throw new Error('Source account not found');
  if (!targetDoc.exists) throw new Error('Target account not found');
  if (data.sourceAccountId === data.targetAccountId) {
    throw new Error('Source and target accounts must be different');
  }

  // Validate type-specific fields
  if ((data.type === 'target' || data.type === 'deficit') && data.targetBalance == null) {
    throw new Error(`targetBalance is required for ${data.type} sweep rules`);
  }
  if (data.type === 'threshold' && data.thresholdValue == null) {
    throw new Error('thresholdValue is required for threshold sweep rules');
  }

  const ref = db.collection('sweepRules').doc();
  const rule: Record<string, any> = {
    name: data.name,
    type: data.type,
    sourceAccountId: data.sourceAccountId,
    targetAccountId: data.targetAccountId,
    createdBy: data.createdBy,
    status: 'draft',
    createdAt: FieldValue.serverTimestamp(),
  };
  if (data.thresholdValue != null) rule.thresholdValue = Number(data.thresholdValue);
  if (data.targetBalance != null) rule.targetBalance = Number(data.targetBalance);

  await ref.set(rule);
  return { ...(rule as SweepRule), id: ref.id };
};

export const updateRule = async (id: string, data: Partial<SweepRule>): Promise<SweepRule> => {
  const ref = db.collection('sweepRules').doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Rule not found');

  const current = doc.data() as SweepRule;
  if (current.status !== 'draft' && current.status !== 'paused') {
    throw new Error('Only draft or paused rules can be edited');
  }

  const { id: _id, createdAt, createdBy, ...safeData } = data as any;
  await ref.update(safeData);
  const updated = await ref.get();
  return { id, ...updated.data() } as SweepRule;
};

export const cloneRule = async (id: string, createdBy: string): Promise<SweepRule> => {
  const doc = await db.collection('sweepRules').doc(id).get();
  if (!doc.exists) throw new Error('Rule not found');

  const original = doc.data() as SweepRule;
  const ref = db.collection('sweepRules').doc();
  const clone: Record<string, any> = {
    name: `${original.name} (Copy)`,
    type: original.type,
    sourceAccountId: original.sourceAccountId,
    targetAccountId: original.targetAccountId,
    createdBy,
    status: 'draft',
    createdAt: FieldValue.serverTimestamp(),
  };
  if (original.thresholdValue != null) clone.thresholdValue = original.thresholdValue;
  if (original.targetBalance != null) clone.targetBalance = original.targetBalance;

  await ref.set(clone);
  return { ...(clone as SweepRule), id: ref.id };
};

export const submitRule = async (id: string): Promise<SweepRule> => {
  const ref = db.collection('sweepRules').doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Rule not found');

  const rule = doc.data() as SweepRule;
  if (rule.status !== 'draft') throw new Error('Only draft rules can be submitted for approval');

  await ref.update({ status: 'pending' });
  return { id, ...rule, status: 'pending' };
};

export const activateRule = async (id: string): Promise<SweepRule> => {
  const ref = db.collection('sweepRules').doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Rule not found');

  const rule = doc.data() as SweepRule;
  if (rule.status !== 'approved') {
    throw new Error('Only approved rules can be activated');
  }

  await ref.update({ status: 'active' });
  return { id, ...rule, status: 'active' };
};

export const pauseRule = async (id: string): Promise<SweepRule> => {
  const ref = db.collection('sweepRules').doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Rule not found');

  const rule = doc.data() as SweepRule;
  if (rule.status !== 'active') throw new Error('Only active rules can be paused');

  await ref.update({ status: 'paused' });
  return { id, ...rule, status: 'paused' };
};

export const getRules = async (): Promise<SweepRule[]> => {
  const snapshot = await db.collection('sweepRules').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SweepRule));
};

export const getRuleById = async (id: string): Promise<SweepRule | null> => {
  const doc = await db.collection('sweepRules').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as SweepRule;
};
