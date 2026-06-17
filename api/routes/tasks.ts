import { Router, type Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireProjectManagerOrAdmin, type AuthRequest } from '../middleware/auth.js';
import type { Task, CreateTaskRequest } from '../types.js';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const projectId = Number(req.params.id);
    const tasks = db.prepare(`
      SELECT t.*,
        COALESCE((SELECT SUM(hours) FROM time_entries te WHERE te.task_id = t.id AND te.status != 'rejected'), 0) as actual_hours
      FROM tasks t
      WHERE t.project_id = ?
      ORDER BY t.created_at
    `).all(projectId) as Task[];

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: '获取任务列表失败' });
  }
});

router.post('/', authMiddleware, requireProjectManagerOrAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const projectId = Number(req.params.id);
    const { name, estimatedHours, status } = req.body as CreateTaskRequest & { status?: string };

    if (!name || !estimatedHours) {
      res.status(400).json({ success: false, error: '请填写任务名称和预估工时' });
      return;
    }

    const taskStatus = status === 'completed' ? 'completed' : 'pending';

    const result = db.prepare(
      'INSERT INTO tasks (project_id, name, estimated_hours, status) VALUES (?, ?, ?, ?)'
    ).run(projectId, name, estimatedHours, taskStatus);

    const task = db.prepare(`
      SELECT t.*, 0 as actual_hours
      FROM tasks t
      WHERE t.id = ?
    `).get(Number(result.lastInsertRowid)) as Task;

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: '创建任务失败' });
  }
});

router.put('/:taskId', authMiddleware, requireProjectManagerOrAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const taskId = Number(req.params.taskId);
    const { name, estimatedHours, status } = req.body;

    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!existing) {
      res.status(404).json({ success: false, error: '任务不存在' });
      return;
    }

    const validStatus = status === 'pending' || status === 'completed' ? status : undefined;

    db.prepare(`
      UPDATE tasks
      SET name = COALESCE(?, name),
          estimated_hours = COALESCE(?, estimated_hours),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, estimatedHours, validStatus, taskId);

    const task = db.prepare(`
      SELECT t.*,
        COALESCE((SELECT SUM(hours) FROM time_entries te WHERE te.task_id = t.id AND te.status != 'rejected'), 0) as actual_hours
      FROM tasks t
      WHERE t.id = ?
    `).get(taskId) as Task;

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: '更新任务失败' });
  }
});

router.delete('/:taskId', authMiddleware, requireProjectManagerOrAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const taskId = Number(req.params.taskId);
    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!existing) {
      res.status(404).json({ success: false, error: '任务不存在' });
      return;
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    res.json({ success: true, message: '任务已删除' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: '删除任务失败' });
  }
});

export default router;
