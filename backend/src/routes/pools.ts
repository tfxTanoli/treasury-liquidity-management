import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import {
  createPool,
  getPools,
  addAccountToPool,
  removeAccountFromPool,
} from '../services/poolService';

const router = Router();

router.get('/', requirePermission('pools_read'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pools = await getPools();
    res.json(pools);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requirePermission('pools_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await createPool(req.body);
    res.status(201).json(pool);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/add-account', requirePermission('pools_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accountId } = req.body;
    if (!accountId) {
      res.status(400).json({ error: 'accountId is required' });
      return;
    }
    const poolAccount = await addAccountToPool(String(req.params.id), accountId);
    res.status(201).json(poolAccount);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id/remove-account', requirePermission('pools_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accountId } = req.body;
    if (!accountId) {
      res.status(400).json({ error: 'accountId is required' });
      return;
    }
    await removeAccountFromPool(String(req.params.id), accountId);
    res.json({ message: 'Account removed from pool' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
