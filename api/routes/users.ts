import { Router, type Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import type { User } from '../types.js';

const router = Router();

router.get('/', authMiddleware, requireRole('admin'), (_req: AuthRequest, res: Response): void => {
  try {
    const users = db.prepare(
      'SELECT id, username, name, role, created_at FROM users ORDER BY id'
    ).all() as User[];
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

router.get('/managers', authMiddleware, (_req: AuthRequest, res: Response): void => {
  try {
    const managers = db.prepare(
      "SELECT id, username, name, role FROM users WHERE role IN ('admin', 'manager') ORDER BY name"
    ).all() as User[];
    res.json({ success: true, data: managers });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ success: false, error: '获取负责人列表失败' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  res.json({ success: true, data: req.user });
});

export default router;
