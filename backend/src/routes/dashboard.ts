import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { getDashboardSummary } from '../services/dashboardService';

const router = Router();

router.get('/summary', requirePermission('dashboard_read'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
