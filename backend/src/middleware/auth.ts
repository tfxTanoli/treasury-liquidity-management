import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { getUserProfile } from '../services/userService';
import { hasPermission, type Role, type Permission } from '../config/roles';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: Role;
  };
}

/** Verify Firebase ID token and attach user + role to request. */
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const profile = await getUserProfile(decoded.uid);

    if (profile.disabled) {
      res.status(403).json({ error: 'Account disabled' });
      return;
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: profile.role,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

/**
 * Permission guard middleware.
 * Usage: router.post('/route', verifyToken, requirePermission('accounts_write'), handler)
 */
export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role || !hasPermission(role, permission)) {
      res.status(403).json({
        error: `Forbidden: requires '${permission}' permission`,
        yourRole: role ?? 'none',
      });
      return;
    }
    next();
  };
};

/** Shorthand: only these specific roles may proceed. */
export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({
        error: `Forbidden: requires one of [${roles.join(', ')}]`,
        yourRole: role ?? 'none',
      });
      return;
    }
    next();
  };
};
