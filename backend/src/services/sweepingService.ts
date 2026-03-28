import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export const executeSweep = async (ruleId: string, executedBy: string): Promise<any> => {
  const ruleDoc = await db.collection('sweepRules').doc(ruleId).get();
  if (!ruleDoc.exists) throw new Error('Sweep rule not found');

  const rule = ruleDoc.data()!;
  if (rule.status !== 'active') {
    throw new Error('Only active rules can be executed');
  }

  const [sourceDoc, targetDoc] = await Promise.all([
    db.collection('accounts').doc(rule.sourceAccountId).get(),
    db.collection('accounts').doc(rule.targetAccountId).get(),
  ]);

  if (!sourceDoc.exists) throw new Error('Source account not found');
  if (!targetDoc.exists) throw new Error('Target account not found');

  const source = sourceDoc.data()!;
  const target = targetDoc.data()!;

  if (source.status !== 'active') throw new Error('Source account is not active');
  if (target.status !== 'active') throw new Error('Target account is not active');

  const sourceBalance = source.balance as number;
  const targetBalance = target.balance as number;

  let transferAmount = 0;
  let failureReason: string | undefined;

  switch (rule.type) {
    case 'zero':
      // Transfer full balance from source to target
      transferAmount = sourceBalance;
      break;

    case 'target':
      // Transfer (sourceBalance - targetBalance) — bring source down to target
      transferAmount = sourceBalance - (rule.targetBalance as number);
      break;

    case 'threshold':
      // Transfer if sourceBalance > threshold, move excess
      if (sourceBalance > (rule.thresholdValue as number)) {
        transferAmount = sourceBalance - (rule.thresholdValue as number);
      } else {
        failureReason = `Source balance (${sourceBalance}) does not exceed threshold (${rule.thresholdValue})`;
      }
      break;

    case 'deficit':
      // Transfer from target to source to bring source up to targetBalance
      // Source is the deficit account, target is the treasury/funding account
      const deficit = (rule.targetBalance as number) - sourceBalance;
      if (deficit > 0) {
        if (targetBalance < deficit) {
          failureReason = `Insufficient funds in target account. Required: ${deficit}, Available: ${targetBalance}`;
        } else {
          transferAmount = deficit;
        }
      } else {
        failureReason = `Source balance (${sourceBalance}) already meets or exceeds target (${rule.targetBalance})`;
      }
      break;

    default:
      throw new Error(`Unknown rule type: ${rule.type}`);
  }

  if (failureReason) {
    // Record failed execution
    const execRef = db.collection('executions').doc();
    const failedExec = {
      ruleId,
      type: 'sweeping',
      sourceAccountId: rule.sourceAccountId,
      targetAccountId: rule.targetAccountId,
      amount: 0,
      status: 'failed',
      failureReason,
      executedBy,
      timestamp: FieldValue.serverTimestamp(),
    };
    await execRef.set(failedExec);
    return { id: execRef.id, ...failedExec };
  }

  if (transferAmount <= 0) {
    const execRef = db.collection('executions').doc();
    const skippedExec = {
      ruleId,
      type: 'sweeping',
      sourceAccountId: rule.sourceAccountId,
      targetAccountId: rule.targetAccountId,
      amount: 0,
      status: 'skipped',
      failureReason: 'Transfer amount is zero or negative — no action taken',
      executedBy,
      timestamp: FieldValue.serverTimestamp(),
    };
    await execRef.set(skippedExec);
    return { id: execRef.id, ...skippedExec };
  }

  // Execute the transfer atomically
  const execRef = db.collection('executions').doc();
  await db.runTransaction(async (transaction) => {
    const freshSource = await transaction.get(db.collection('accounts').doc(rule.sourceAccountId));
    const freshTarget = await transaction.get(db.collection('accounts').doc(rule.targetAccountId));

    const freshSourceBalance = freshSource.data()!.balance as number;
    const freshTargetBalance = freshTarget.data()!.balance as number;

    // For deficit sweeps, money flows from target to source
    if (rule.type === 'deficit') {
      if (freshTargetBalance < transferAmount) {
        throw new Error('Insufficient funds in target account (race condition)');
      }
      transaction.update(db.collection('accounts').doc(rule.sourceAccountId), {
        balance: freshSourceBalance + transferAmount,
      });
      transaction.update(db.collection('accounts').doc(rule.targetAccountId), {
        balance: freshTargetBalance - transferAmount,
      });
    } else {
      // For other types, money flows from source to target
      if (freshSourceBalance < transferAmount) {
        throw new Error('Insufficient funds in source account (race condition)');
      }
      transaction.update(db.collection('accounts').doc(rule.sourceAccountId), {
        balance: freshSourceBalance - transferAmount,
      });
      transaction.update(db.collection('accounts').doc(rule.targetAccountId), {
        balance: freshTargetBalance + transferAmount,
      });
    }

    transaction.set(execRef, {
      ruleId,
      type: 'sweeping',
      sourceAccountId: rule.sourceAccountId,
      targetAccountId: rule.targetAccountId,
      amount: transferAmount,
      status: 'completed',
      executedBy,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  const execDoc = await execRef.get();
  return { id: execRef.id, ...execDoc.data() };
};
