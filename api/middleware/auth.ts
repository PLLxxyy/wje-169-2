import jwt from 'jsonwebtoken';
import { type Request, type Response, type NextFunction } from 'express';
import type { User, UserRole } from '../types.js';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'timesheet-secret-key-2024';

export interface AuthRequest extends Request {
  user?: User;
}

export function signToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(decoded.id) as User | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: '无效的认证令牌' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '权限不足' });
      return;
    }
    next();
  };
}

export function requireProjectManagerOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' });
    return;
  }
  if (req.user.role === 'admin') {
    next();
    return;
  }
  if (req.user.role === 'manager') {
    const projectId = req.params.id || req.body.projectId;
    if (!projectId) {
      next();
      return;
    }
    const project = db.prepare('SELECT manager_id FROM projects WHERE id = ?').get(Number(projectId)) as { manager_id: number } | undefined;
    if (project && project.manager_id === req.user.id) {
      next();
      return;
    }
  }
  res.status(403).json({ success: false, error: '权限不足' });
}
