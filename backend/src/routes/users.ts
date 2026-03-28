import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import {
  listUsers,
  createUser,
  updateUserRole,
  setUserDisabled,
  getUserProfile,
  upsertUserProfile,
} from '../services/userService';
import type { Role } from '../config/roles';
import { ROLES } from '../config/roles';

const router = Router();

/**
 * POST /api/users/register — called right after Firebase signup.
 * Creates a Firestore profile with role "viewer".
 * No permission guard — any authenticated user can call this once.
 */
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName } = req.body;
    const profile = await upsertUserProfile(req.user!.uid, {
      uid: req.user!.uid,
      email: req.user!.email || '',
      displayName: (displayName || '').trim(),
      role: 'viewer',
      disabled: false,
    });
    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/users — list all users (admin only) */
router.get('/', requirePermission('users_read'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/users/me — current user's profile + role */
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await getUserProfile(req.user!.uid);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** PATCH /api/users/me/display-name — update own display name */
router.patch('/me/display-name', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName } = req.body;
    if (!displayName || !String(displayName).trim()) {
      res.status(400).json({ error: 'displayName is required' });
      return;
    }
    const profile = await upsertUserProfile(req.user!.uid, {
      displayName: String(displayName).trim(),
    });
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** POST /api/users — create user (admin only) */
router.post('/', requirePermission('users_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, displayName, role } = req.body;
    if (!email || !password || !displayName || !role) {
      res.status(400).json({ error: 'email, password, displayName, and role are required' });
      return;
    }
    if (!Object.keys(ROLES).includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${Object.keys(ROLES).join(', ')}` });
      return;
    }
    const user = await createUser({ email, password, displayName, role }, req.user!.uid);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/** PATCH /api/users/:uid/role — update user role (admin only) */
router.patch('/:uid/role', requirePermission('users_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    if (!Object.keys(ROLES).includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${Object.keys(ROLES).join(', ')}` });
      return;
    }
    // Prevent admin from demoting themselves
    if (String(req.params.uid) === req.user!.uid && role !== 'admin') {
      res.status(400).json({ error: 'Admins cannot remove their own admin role' });
      return;
    }
    const user = await updateUserRole(String(req.params.uid), role as Role, req.user!.uid);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/** PATCH /api/users/:uid/disable — disable or enable a user (admin only) */
router.patch('/:uid/disable', requirePermission('users_write'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { disabled } = req.body;
    if (typeof disabled !== 'boolean') {
      res.status(400).json({ error: 'disabled must be a boolean' });
      return;
    }
    if (String(req.params.uid) === req.user!.uid) {
      res.status(400).json({ error: 'Cannot disable your own account' });
      return;
    }
    await setUserDisabled(String(req.params.uid), disabled);
    res.json({ message: `User ${disabled ? 'disabled' : 'enabled'} successfully` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
