import { Router, type Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole, requireProjectManagerOrAdmin, type AuthRequest } from '../middleware/auth.js';
import type { Project, CreateProjectRequest } from '../types.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    let projects: Project[];

    if (user.role === 'admin') {
      projects = db.prepare(`
        SELECT p.*, u.name as manager_name,
          COALESCE((SELECT SUM(hours) FROM time_entries te WHERE te.project_id = p.id AND te.status != 'rejected'), 0) as actual_hours
        FROM projects p
        LEFT JOIN users u ON p.manager_id = u.id
        ORDER BY p.created_at DESC
      `).all() as Project[];
    } else if (user.role === 'manager') {
      projects = db.prepare(`
        SELECT p.*, u.name as manager_name,
          COALESCE((SELECT SUM(hours) FROM time_entries te WHERE te.project_id = p.id AND te.status != 'rejected'), 0) as actual_hours
        FROM projects p
        LEFT JOIN users u ON p.manager_id = u.id
        WHERE p.manager_id = ?
        ORDER BY p.created_at DESC
      `).all(user.id) as Project[];
    } else {
      projects = db.prepare(`
        SELECT DISTINCT p.*, u.name as manager_name,
          COALESCE((SELECT SUM(hours) FROM time_entries te WHERE te.project_id = p.id AND te.status != 'rejected'), 0) as actual_hours
        FROM projects p
        LEFT JOIN users u ON p.manager_id = u.id
        INNER JOIN time_entries te ON te.project_id = p.id AND te.user_id = ?
        ORDER BY p.created_at DESC
      `).all(user.id) as Project[];
    }

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: '获取项目列表失败' });
  }
});

router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const project = db.prepare(`
      SELECT p.*, u.name as manager_name,
        COALESCE((SELECT SUM(hours) FROM time_entries te WHERE te.project_id = p.id AND te.status != 'rejected'), 0) as actual_hours
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = ?
    `).get(Number(req.params.id)) as Project | undefined;

    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: '获取项目详情失败' });
  }
});

router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  try {
    const { name, managerId, estimatedHours, startDate, endDate } = req.body as CreateProjectRequest;

    if (!name || !managerId || !estimatedHours || !startDate || !endDate) {
      res.status(400).json({ success: false, error: '请填写所有必填字段' });
      return;
    }

    const result = db.prepare(`
      INSERT INTO projects (name, manager_id, estimated_hours, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, managerId, estimatedHours, startDate, endDate);

    const project = db.prepare(`
      SELECT p.*, u.name as manager_name, 0 as actual_hours
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = ?
    `).get(Number(result.lastInsertRowid)) as Project;

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: '创建项目失败' });
  }
});

router.put('/:id', authMiddleware, requireProjectManagerOrAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const { name, managerId, estimatedHours, startDate, endDate, status } = req.body;
    const projectId = Number(req.params.id);

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!existing) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }

    db.prepare(`
      UPDATE projects
      SET name = COALESCE(?, name),
          manager_id = COALESCE(?, manager_id),
          estimated_hours = COALESCE(?, estimated_hours),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, managerId, estimatedHours, startDate, endDate, status, projectId);

    const project = db.prepare(`
      SELECT p.*, u.name as manager_name,
        COALESCE((SELECT SUM(hours) FROM time_entries te WHERE te.project_id = p.id AND te.status != 'rejected'), 0) as actual_hours
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = ?
    `).get(projectId) as Project;

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: '更新项目失败' });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  try {
    const projectId = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!existing) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    res.json({ success: true, message: '项目已删除' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, error: '删除项目失败' });
  }
});

export default router;
