import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import {
  createAccount,
  getAccounts,
  updateAccount,
  updateAccountStatus,
} from '../services/accountService';

const router = Router();

router.get('/', requirePermission('accounts_read'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accounts = await getAccounts();
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requirePermission('accounts_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const account = await createAccount(req.body);
    res.status(201).json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requirePermission('accounts_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const account = await updateAccount(String(req.params.id), req.body);
    res.json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/status', requirePermission('accounts_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be active or inactive' });
      return;
    }
    const account = await updateAccountStatus(String(req.params.id), status);
    res.json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
