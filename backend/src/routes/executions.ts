import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { getExecutions } from '../services/executionService';

const router = Router();

router.get('/', requirePermission('executions_read'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, status, limit } = req.query;
    const executions = await getExecutions({
      type: type as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
