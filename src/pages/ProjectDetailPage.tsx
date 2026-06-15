import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Project, Task, TimeEntry, ProjectDetailStats } from '@/types';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<ProjectDetailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ name: '', estimatedHours: '' });
  const [submitting, setSubmitting] = useState(false);

  const canManage = user && (user.role === 'admin' || (user.role === 'manager' && project?.manager_id === user.id));

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [projectData, tasksData, entriesData, statsData] = await Promise.all([
        api.projects.get(Number(id)),
        api.tasks.list(Number(id)),
        api.timeEntries.byProject(Number(id)),
        api.stats.projectDetail(Number(id)),
      ]);
      setProject(projectData);
      setTasks(tasksData);
      setTimeEntries(entriesData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Load project error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.name || !taskForm.estimatedHours) return;

    setSubmitting(true);
    try {
      if (editingTask) {
        await api.tasks.update(Number(id), editingTask.id, {
          name: taskForm.name,
          estimatedHours: Number(taskForm.estimatedHours),
        });
      } else {
        await api.tasks.create(Number(id), {
          name: taskForm.name,
          estimatedHours: Number(taskForm.estimatedHours),
        });
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ name: '', estimatedHours: '' });
      loadData();
    } catch (err: any) {
      console.error('Save task error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('确定要删除此任务吗？')) return;
    try {
      await api.tasks.delete(Number(id), taskId);
      loadData();
    } catch (err: any) {
      console.error('Delete task error:', err);
    }
  };

  const handleApprove = async (entryId: number) => {
    try {
      await api.timeEntries.approve(entryId);
      loadData();
    } catch (err: any) {
      console.error('Approve error:', err);
    }
  };

  const handleReject = async (entryId: number) => {
    try {
      await api.timeEntries.reject(entryId);
      loadData();
    } catch (err: any) {
      console.error('Reject error:', err);
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({ name: task.name, estimatedHours: String(task.estimated_hours) });
    setShowTaskModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">项目不存在</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 text-blue-700 hover:underline"
        >
          返回项目列表
        </button>
      </div>
    );
  }

  const usage = project.estimated_hours > 0
    ? Math.min(100, Math.round(((project.actual_hours || 0) / project.estimated_hours) * 100))
    : 0;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '已通过',
      rejected: '已驳回',
    };
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-slate-600 hover:text-blue-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        返回项目列表
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    project.status === 'active'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {project.status === 'active' ? '进行中' : '已完成'}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-3">{project.name}</h1>
              <div className="flex flex-wrap gap-6 text-blue-200">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>负责人：{project.manager_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {project.start_date} ~ {project.end_date}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">工时使用率</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{usage}%</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm">工时消耗</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {project.actual_hours || 0}
                <span className="text-lg font-normal text-slate-400 ml-1">
                  / {project.estimated_hours}h
                </span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <Users className="w-4 h-4" />
                <span className="text-sm">参与人数</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{stats?.memberCount || 0}</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 font-medium">总进度</span>
              <span className="font-semibold text-slate-800">
                {project.actual_hours || 0}h / {project.estimated_hours}h
              </span>
            </div>
            <div className="relative h-10 bg-slate-100 rounded-xl overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-200 to-blue-300 transition-all duration-700"
                style={{ width: '100%' }}
              />
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                  usage >= 100
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : usage >= 80
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                    : 'bg-gradient-to-r from-teal-500 to-teal-600'
                }`}
                style={{ width: `${usage}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white drop-shadow-lg">{usage}%</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>预估工时（浅蓝）</span>
              <span>实际工时（深色）</span>
            </div>
          </div>

          {stats?.members && stats.members.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">成员工时概览</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.members.map((member) => (
                  <div key={member.userId} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {member.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{member.userName}</p>
                        <p className="text-xs text-slate-500">总工时 {member.totalHours}h</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md">
                        已通过 {member.approvedHours}h
                      </span>
                      {member.pendingHours > 0 && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-md">
                          待审批 {member.pendingHours}h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">任务列表</h3>
              {canManage && (
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setTaskForm({ name: '', estimatedHours: '' });
                    setShowTaskModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加任务
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">暂无任务</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const taskEntries = timeEntries.filter((e) => e.task_id === task.id);
                  const taskUsage = task.estimated_hours > 0
                    ? Math.min(100, Math.round(((task.actual_hours || 0) / task.estimated_hours) * 100))
                    : 0;
                  const isExpanded = expandedTask === task.id;

                  return (
                    <div key={task.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div
                        className="p-5 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-slate-800">{task.name}</h4>
                              {canManage && (
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => openEditTask(task)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1 max-w-md">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      taskUsage >= 100
                                        ? 'bg-red-500'
                                        : taskUsage >= 80
                                        ? 'bg-orange-500'
                                        : 'bg-teal-500'
                                    }`}
                                    style={{ width: `${taskUsage}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
                                {task.actual_hours || 0} / {task.estimated_hours}h ({taskUsage}%)
                              </span>
                              <span className="text-sm text-slate-500">
                                {taskEntries.length} 条记录
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-200">
                          {taskEntries.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm">暂无工时记录</div>
                          ) : (
                            <div className="divide-y divide-slate-200">
                              {taskEntries.map((entry) => (
                                <div key={entry.id} className="p-4 flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {entry.user_name?.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-slate-800">{entry.user_name}</span>
                                      {getStatusBadge(entry.status)}
                                    </div>
                                    <p className="text-sm text-slate-600 truncate">{entry.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">{entry.date}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-lg font-bold text-slate-800">{entry.hours}h</p>
                                    {canManage && entry.status === 'pending' && (
                                      <div className="flex gap-1 mt-2">
                                        <button
                                          onClick={() => handleApprove(entry.id)}
                                          className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition-colors"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleReject(entry.id)}
                                          className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editingTask ? '编辑任务' : '添加任务'}
              </h3>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">任务名称</label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="请输入任务名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">预估工时（小时）</label>
                <input
                  type="number"
                  min="1"
                  value={taskForm.estimatedHours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="请输入预估工时"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
