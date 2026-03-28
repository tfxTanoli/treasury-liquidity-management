import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import {
  createRule,
  updateRule,
  cloneRule,
  submitRule,
  activateRule,
  pauseRule,
  getRules,
} from '../services/ruleService';

const router = Router();

router.get('/', requirePermission('rules_read'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rules = await getRules();
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requirePermission('rules_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rule = await createRule({ ...req.body, createdBy: req.user!.uid });
    res.status(201).json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requirePermission('rules_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rule = await updateRule(String(req.params.id), req.body);
    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/clone', requirePermission('rules_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rule = await cloneRule(String(req.params.id), req.user!.uid);
    res.status(201).json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/submit', requirePermission('rules_submit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rule = await submitRule(String(req.params.id));
    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/activate', requirePermission('rules_activate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rule = await activateRule(String(req.params.id));
    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/pause', requirePermission('rules_pause'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rule = await pauseRule(String(req.params.id));
    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
