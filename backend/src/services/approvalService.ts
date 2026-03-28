import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface Approval {
  id?: string;
  ruleId: string;
  status: 'approved' | 'rejected';
  approvedBy: string;
  comment?: string;
  timestamp?: FirebaseFirestore.Timestamp;
}

export const approveRule = async (
  ruleId: string,
  approvedBy: string,
  comment?: string
): Promise<Approval> => {
  const ruleRef = db.collection('sweepRules').doc(ruleId);
  const ruleDoc = await ruleRef.get();
  if (!ruleDoc.exists) throw new Error('Rule not found');

  const rule = ruleDoc.data()!;
  if (rule.status !== 'pending') {
    throw new Error('Only pending rules can be approved');
  }
  // Prevent self-approval
  if (rule.createdBy === approvedBy) {
    throw new Error('Rule creator cannot approve their own rule');
  }

  await db.runTransaction(async (transaction) => {
    transaction.update(ruleRef, { status: 'approved' });
    const approvalRef = db.collection('approvals').doc();
    transaction.set(approvalRef, {
      ruleId,
      status: 'approved',
      approvedBy,
      comment: comment || '',
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  const approvalRef = db.collection('approvals').doc();
  const approval: Approval = {
    ruleId,
    status: 'approved',
    approvedBy,
    comment: comment || '',
    timestamp: FieldValue.serverTimestamp() as any,
  };
  return approval;
};

export const rejectRule = async (
  ruleId: string,
  rejectedBy: string,
  comment?: string
): Promise<Approval> => {
  const ruleRef = db.collection('sweepRules').doc(ruleId);
  const ruleDoc = await ruleRef.get();
  if (!ruleDoc.exists) throw new Error('Rule not found');

  const rule = ruleDoc.data()!;
  if (rule.status !== 'pending') {
    throw new Error('Only pending rules can be rejected');
  }

  await db.runTransaction(async (transaction) => {
    transaction.update(ruleRef, { status: 'rejected' });
    const approvalRef = db.collection('approvals').doc();
    transaction.set(approvalRef, {
      ruleId,
      status: 'rejected',
      approvedBy: rejectedBy,
      comment: comment || '',
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  const approval: Approval = {
    ruleId,
    status: 'rejected',
    approvedBy: rejectedBy,
    comment: comment || '',
    timestamp: FieldValue.serverTimestamp() as any,
  };
  return approval;
};

export const getApprovals = async (): Promise<Approval[]> => {
  const snapshot = await db.collection('approvals').orderBy('timestamp', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Approval));
};

export const getApprovalsByRule = async (ruleId: string): Promise<Approval[]> => {
  const snapshot = await db
    .collection('approvals')
    .where('ruleId', '==', ruleId)
    .orderBy('timestamp', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Approval));
};
