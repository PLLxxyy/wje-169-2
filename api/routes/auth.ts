import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken } from '../middleware/auth.js';
import type { User, UserWithPassword } from '../types.js';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserWithPassword | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    const token = signToken(user);
    const { password: _pwd, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        token,
        user: userWithoutPassword as User,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: '已退出登录' });
});

export default router;
