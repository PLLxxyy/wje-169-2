import { useState, useEffect } from 'react';
import {
  Clock,
  FolderKanban,
  ListTodo,
  CalendarDays,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Project, Task, TimeEntry } from '@/types';

export default function TimesheetPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    projectId: '',
    taskId: '',
    date: today,
    hours: '8',
    description: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      loadTasks(Number(formData.projectId));
    } else {
      setTasks([]);
      setFormData((prev) => ({ ...prev, taskId: '' }));
    }
  }, [formData.projectId]);

  const loadData = async () => {
    try {
      const [projectsData, entriesData] = await Promise.all([
        api.projects.list(),
        api.timeEntries.list(),
      ]);
      setProjects(projectsData);
      setEntries(entriesData);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (projectId: number) => {
    try {
      const data = await api.tasks.list(projectId);
      setTasks(data);
    } catch (err: any) {
      console.error('Load tasks error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.projectId || !formData.taskId || !formData.date || !formData.hours) {
      setError('请填写所有必填字段');
      return;
    }

    const hours = Number(formData.hours);
    if (hours <= 0 || hours > 24) {
      setError('工时必须在0-24小时之间');
      return;
    }

    setSubmitting(true);
    try {
      await api.timeEntries.create({
        projectId: Number(formData.projectId),
        taskId: Number(formData.taskId),
        date: formData.date,
        hours,
        description: formData.description,
      });
      setFormData({
        projectId: formData.projectId,
        taskId: '',
        date: today,
        hours: '8',
        description: '',
      });
      setSuccess('工时提交成功！');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条工时记录吗？')) return;
    try {
      await api.timeEntries.delete(id);
      loadData();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const todayTotal = entries
    .filter((e) => e.date === today && e.status !== 'rejected')
    .reduce((sum, e) => sum + e.hours, 0);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string; bg: string }> = {
      pending: {
        icon: AlertCircle,
        color: 'text-orange-700',
        bg: 'bg-orange-100',
        label: '待审批',
      },
      approved: {
        icon: CheckCircle2,
        color: 'text-green-700',
        bg: 'bg-green-100',
        label: '已通过',
      },
      rejected: {
        icon: XCircle,
        color: 'text-red-700',
        bg: 'bg-red-100',
        label: '已驳回',
      },
    };
    const cfg = config[status];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">工时填报</h1>
        <p className="text-slate-500 mt-1">记录您的每日工时和工作内容</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-700" />
            填写工时
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-slate-400" />
                  选择项目
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">请选择项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-slate-400" />
                  选择任务
                </label>
                <select
                  value={formData.taskId}
                  onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                  disabled={!formData.projectId}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{formData.projectId ? '请选择任务' : '先选择项目'}</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  日期
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  工时（小时）
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">工作内容描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="请描述今天做了什么工作..."
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-700/25 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  提交工时
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-blue-200 text-sm mb-1">今日已填工时</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{todayTotal}</span>
              <span className="text-blue-200">小时</span>
            </div>
            <div className="mt-4 h-2 bg-blue-950/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-300 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (todayTotal / 8) * 100)}%` }}
              />
            </div>
            <p className="text-blue-200 text-xs mt-2">
              {todayTotal >= 8 ? '已完成今日目标 🎉' : `还差 ${(8 - todayTotal).toFixed(1)} 小时达到 8 小时标准`}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">快速提示</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                工时提交后进入待审批状态
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                审批通过后工时将被锁定，无法修改
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                驳回的工时可以修改后重新提交
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                请准确填写工作内容描述
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">我的工时记录</h2>

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">暂无工时记录，开始填写第一条吧！</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">日期</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">项目</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">任务</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">工作内容</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">工时</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">状态</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.slice(0, 20).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 text-sm text-slate-700">{entry.date}</td>
                    <td className="py-4 px-4 text-sm text-slate-700">{entry.project_name}</td>
                    <td className="py-4 px-4 text-sm text-slate-700">{entry.task_name}</td>
                    <td className="py-4 px-4 text-sm text-slate-600 max-w-xs truncate">
                      {entry.description || '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-semibold text-slate-800">
                      {entry.hours}h
                    </td>
                    <td className="py-4 px-4 text-center">{getStatusBadge(entry.status)}</td>
                    <td className="py-4 px-4 text-center">
                      {entry.status !== 'approved' && (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
