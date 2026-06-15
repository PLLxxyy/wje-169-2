import { Router, type Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import type { ProjectStats, PersonalStats } from '../types.js';

const router = Router();

router.get('/projects', authMiddleware, requireRole('admin'), (_req: AuthRequest, res: Response): void => {
  try {
    const projects = db.prepare(`
      SELECT 
        p.id as projectId,
        p.name as projectName,
        p.estimated_hours as estimatedHours,
        COALESCE(SUM(CASE WHEN te.status != 'rejected' THEN te.hours ELSE 0 END), 0) as actualHours,
        COUNT(DISTINCT te.user_id) as memberCount
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
      GROUP BY p.id
      ORDER BY actualHours DESC
    `).all() as Array<{
      projectId: number;
      projectName: string;
      estimatedHours: number;
      actualHours: number;
      memberCount: number;
    }>;

    const stats: ProjectStats[] = projects.map(p => ({
      ...p,
      usageRate: p.estimatedHours > 0 ? Math.min(100, Math.round((p.actualHours / p.estimatedHours) * 100)) : 0,
    }));

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ success: false, error: '获取项目统计失败' });
  }
});

router.get('/projects/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const projectId = Number(req.params.id);

    const project = db.prepare(`
      SELECT 
        p.id as projectId,
        p.name as projectName,
        p.estimated_hours as estimatedHours,
        COALESCE(SUM(CASE WHEN te.status != 'rejected' THEN te.hours ELSE 0 END), 0) as actualHours,
        COUNT(DISTINCT te.user_id) as memberCount
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(projectId) as {
      projectId: number;
      projectName: string;
      estimatedHours: number;
      actualHours: number;
      memberCount: number;
    } | undefined;

    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }

    const tasks = db.prepare(`
      SELECT 
        t.id as taskId,
        t.name as taskName,
        t.estimated_hours as estimatedHours,
        COALESCE(SUM(CASE WHEN te.status != 'rejected' THEN te.hours ELSE 0 END), 0) as actualHours
      FROM tasks t
      LEFT JOIN time_entries te ON te.task_id = t.id
      WHERE t.project_id = ?
      GROUP BY t.id
      ORDER BY t.id
    `).all(projectId);

    const members = db.prepare(`
      SELECT 
        u.id as userId,
        u.name as userName,
        COALESCE(SUM(CASE WHEN te.status = 'approved' THEN te.hours ELSE 0 END), 0) as approvedHours,
        COALESCE(SUM(CASE WHEN te.status = 'pending' THEN te.hours ELSE 0 END), 0) as pendingHours,
        COALESCE(SUM(CASE WHEN te.status != 'rejected' THEN te.hours ELSE 0 END), 0) as totalHours
      FROM users u
      INNER JOIN time_entries te ON te.user_id = u.id
      WHERE te.project_id = ?
      GROUP BY u.id
      ORDER BY totalHours DESC
    `).all(projectId);

    res.json({
      success: true,
      data: {
        ...project,
        usageRate: project.estimatedHours > 0 ? Math.min(100, Math.round((project.actualHours / project.estimatedHours) * 100)) : 0,
        tasks,
        members,
      },
    });
  } catch (error) {
    console.error('Get project detail stats error:', error);
    res.status(500).json({ success: false, error: '获取项目统计失败' });
  }
});

router.get('/personal', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const byProject = db.prepare(`
      SELECT 
        p.id as projectId,
        p.name as projectName,
        COALESCE(SUM(CASE WHEN te.status != 'rejected' THEN te.hours ELSE 0 END), 0) as hours
      FROM projects p
      INNER JOIN time_entries te ON te.project_id = p.id AND te.user_id = ?
      WHERE te.date >= ? AND te.date <= ?
      GROUP BY p.id
      ORDER BY hours DESC
    `).all(user.id, firstDay, lastDay) as Array<{
      projectId: number;
      projectName: string;
      hours: number;
    }>;

    const totalHours = byProject.reduce((sum, p) => sum + p.hours, 0);

    const byProjectWithPercentage = byProject.map(p => ({
      ...p,
      percentage: totalHours > 0 ? Math.round((p.hours / totalHours) * 100) : 0,
    }));

    const calendarData = db.prepare(`
      SELECT date, SUM(hours) as hours
      FROM time_entries
      WHERE user_id = ? AND date >= ? AND date <= ? AND status != 'rejected'
      GROUP BY date
      ORDER BY date
    `).all(user.id, firstDay, lastDay) as Array<{
      date: string;
      hours: number;
    }>;

    const stats: PersonalStats = {
      totalHours,
      byProject: byProjectWithPercentage,
      calendarData,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get personal stats error:', error);
    res.status(500).json({ success: false, error: '获取个人统计失败' });
  }
});

router.get('/overview', authMiddleware, requireRole('admin'), (_req: AuthRequest, res: Response): void => {
  try {
    const totalProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'archived'").get() as { count: number };
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('employee') as { count: number };
    const totalHours = db.prepare("SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE status != 'rejected'").get() as { total: number };
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM time_entries WHERE status = 'pending'").get() as { count: number };

    const projectUsage = db.prepare(`
      SELECT 
        p.id as projectId,
        p.name as projectName,
        p.estimated_hours as estimatedHours,
        COALESCE(SUM(CASE WHEN te.status != 'rejected' THEN te.hours ELSE 0 END), 0) as actualHours
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
      GROUP BY p.id
      ORDER BY actualHours DESC
      LIMIT 10
    `).all();

    const memberRanking = db.prepare(`
      SELECT 
        u.id as userId,
        u.name as userName,
        COALESCE(SUM(CASE WHEN te.status != 'rejected' THEN te.hours ELSE 0 END), 0) as totalHours,
        COUNT(DISTINCT te.project_id) as projectCount
      FROM users u
      LEFT JOIN time_entries te ON te.user_id = u.id
      WHERE u.role = 'employee'
      GROUP BY u.id
      ORDER BY totalHours DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        totalProjects: totalProjects.count,
        totalUsers: totalUsers.count,
        totalHours: totalHours.total,
        pendingCount: pendingCount.count,
        projectUsage,
        memberRanking,
      },
    });
  } catch (error) {
    console.error('Get overview stats error:', error);
    res.status(500).json({ success: false, error: '获取概览统计失败' });
  }
});

export default router;
