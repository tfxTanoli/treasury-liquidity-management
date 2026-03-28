import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { approveRule, rejectRule, getApprovals } from '../services/approvalService';

const router = Router();

router.get('/', requirePermission('approvals_read'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const approvals = await getApprovals();
    res.json(approvals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:ruleId/approve', requirePermission('approvals_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const approval = await approveRule(String(req.params.ruleId), req.user!.uid, req.body.comment);
    res.json(approval);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:ruleId/reject', requirePermission('approvals_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const approval = await rejectRule(String(req.params.ruleId), req.user!.uid, req.body.comment);
    res.json(approval);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
