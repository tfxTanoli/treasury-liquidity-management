import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { executeSweep } from '../services/sweepingService';

const router = Router();

router.post('/:ruleId/execute', requirePermission('sweeping_execute'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await executeSweep(String(req.params.ruleId), req.user!.uid);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
