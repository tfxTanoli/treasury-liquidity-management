import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { executePooling } from '../services/poolingService';

const router = Router();

router.post('/:poolId/execute', requirePermission('pooling_execute'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await executePooling(String(req.params.poolId), req.user!.uid);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
