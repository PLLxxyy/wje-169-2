import { Router, type Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireProjectManagerOrAdmin, type AuthRequest } from '../middleware/auth.js';
import type { TimeEntry, CreateTimeEntryRequest } from '../types.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const { projectId, startDate, endDate } = req.query;

    let query = `
      SELECT te.*, u.name as user_name, p.name as project_name, t.name as task_name
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (user.role === 'employee') {
      query += ' AND te.user_id = ?';
      params.push(user.id);
    } else if (user.role === 'manager') {
      query += ` AND (te.user_id = ? OR te.project_id IN (SELECT id FROM projects WHERE manager_id = ?))`;
      params.push(user.id, user.id);
    }

    if (projectId) {
      query += ' AND te.project_id = ?';
      params.push(Number(projectId));
    }
    if (startDate) {
      query += ' AND te.date >= ?';
      params.push(startDate as string);
    }
    if (endDate) {
      query += ' AND te.date <= ?';
      params.push(endDate as string);
    }

    query += ' ORDER BY te.date DESC, te.created_at DESC';

    const entries = db.prepare(query).all(...params) as TimeEntry[];
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ success: false, error: '获取工时记录失败' });
  }
});

router.get('/project/:projectId', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const projectId = Number(req.params.projectId);
    const entries = db.prepare(`
      SELECT te.*, u.name as user_name, p.name as project_name, t.name as task_name
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.project_id = ?
      ORDER BY te.date DESC, te.created_at DESC
    `).all(projectId) as TimeEntry[];

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get project time entries error:', error);
    res.status(500).json({ success: false, error: '获取项目工时记录失败' });
  }
});

router.post('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const { projectId, taskId, date, hours, description } = req.body as CreateTimeEntryRequest;

    if (!projectId || !taskId || !date || !hours) {
      res.status(400).json({ success: false, error: '请填写所有必填字段' });
      return;
    }

    if (hours <= 0 || hours > 24) {
      res.status(400).json({ success: false, error: '工时必须在0-24小时之间' });
      return;
    }

    const result = db.prepare(`
      INSERT INTO time_entries (user_id, project_id, task_id, date, hours, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, projectId, taskId, date, hours, description || '');

    const entry = db.prepare(`
      SELECT te.*, u.name as user_name, p.name as project_name, t.name as task_name
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.id = ?
    `).get(Number(result.lastInsertRowid)) as TimeEntry;

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ success: false, error: '创建工时记录失败' });
  }
});

router.put('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const entryId = Number(req.params.id);
    const { date, hours, description } = req.body;

    const existing = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(entryId) as TimeEntry | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '工时记录不存在' });
      return;
    }

    if (existing.status === 'approved') {
      res.status(400).json({ success: false, error: '已审批的工时记录不能修改' });
      return;
    }

    if (existing.user_id !== user.id && user.role === 'employee') {
      res.status(403).json({ success: false, error: '只能修改自己的工时记录' });
      return;
    }

    db.prepare(`
      UPDATE time_entries
      SET date = COALESCE(?, date),
          hours = COALESCE(?, hours),
          description = COALESCE(?, description)
      WHERE id = ?
    `).run(date, hours, description, entryId);

    const entry = db.prepare(`
      SELECT te.*, u.name as user_name, p.name as project_name, t.name as task_name
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.id = ?
    `).get(entryId) as TimeEntry;

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ success: false, error: '更新工时记录失败' });
  }
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const entryId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(entryId) as TimeEntry | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '工时记录不存在' });
      return;
    }

    if (existing.status === 'approved') {
      res.status(400).json({ success: false, error: '已审批的工时记录不能删除' });
      return;
    }

    if (existing.user_id !== user.id && user.role === 'employee') {
      res.status(403).json({ success: false, error: '只能删除自己的工时记录' });
      return;
    }

    db.prepare('DELETE FROM time_entries WHERE id = ?').run(entryId);
    res.json({ success: true, message: '工时记录已删除' });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ success: false, error: '删除工时记录失败' });
  }
});

router.post('/:id/approve', authMiddleware, requireProjectManagerOrAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const entryId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(entryId) as TimeEntry | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '工时记录不存在' });
      return;
    }

    db.prepare(`
      UPDATE time_entries
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(entryId);

    const entry = db.prepare(`
      SELECT te.*, u.name as user_name, p.name as project_name, t.name as task_name
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.id = ?
    `).get(entryId) as TimeEntry;

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Approve time entry error:', error);
    res.status(500).json({ success: false, error: '审批工时记录失败' });
  }
});

router.post('/:id/reject', authMiddleware, requireProjectManagerOrAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const entryId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(entryId) as TimeEntry | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '工时记录不存在' });
      return;
    }

    db.prepare(`
      UPDATE time_entries
      SET status = 'rejected', approved_at = NULL
      WHERE id = ?
    `).run(entryId);

    const entry = db.prepare(`
      SELECT te.*, u.name as user_name, p.name as project_name, t.name as task_name
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.id = ?
    `).get(entryId) as TimeEntry;

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Reject time entry error:', error);
    res.status(500).json({ success: false, error: '驳回工时记录失败' });
  }
});

export default router;
