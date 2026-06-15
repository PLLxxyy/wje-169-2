import { useState, useEffect } from 'react';
import {
  FolderKanban,
  Users,
  Clock,
  AlertCircle,
  Plus,
  TrendingUp,
  DollarSign,
  BarChart3,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import type { OverviewStats, User, Project } from '@/types';

const COLORS = ['#1E3A8A', '#0D9488', '#F97316', '#6366F1', '#EC4899', '#8B5CF6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    managerId: '',
    estimatedHours: '',
    startDate: '',
    endDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, managersData, projectsData] = await Promise.all([
        api.stats.overview(),
        api.users.managers(),
        api.projects.list(),
      ]);
      setStats(overviewData);
      setManagers(managersData);
      setProjects(projectsData);
    } catch (err: any) {
      console.error('Load dashboard error:', err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.managerId || !formData.estimatedHours || !formData.startDate || !formData.endDate) {
      setError('请填写所有字段');
      return;
    }

    setSubmitting(true);
    try {
      await api.projects.create({
        name: formData.name,
        managerId: Number(formData.managerId),
        estimatedHours: Number(formData.estimatedHours),
        startDate: formData.startDate,
        endDate: formData.endDate,
      });
      setShowCreateModal(false);
      setFormData({ name: '', managerId: '', estimatedHours: '', startDate: '', endDate: '' });
      loadData();
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const statCards = stats
    ? [
        {
          label: '活跃项目',
          value: stats.totalProjects,
          icon: FolderKanban,
          color: 'from-blue-700 to-blue-900',
          bgLight: 'bg-blue-50',
          textColor: 'text-blue-700',
        },
        {
          label: '团队成员',
          value: stats.totalUsers,
          icon: Users,
          color: 'from-teal-600 to-teal-800',
          bgLight: 'bg-teal-50',
          textColor: 'text-teal-700',
        },
        {
          label: '累计工时',
          value: `${stats.totalHours} h`,
          icon: Clock,
          color: 'from-orange-500 to-orange-700',
          bgLight: 'bg-orange-50',
          textColor: 'text-orange-600',
        },
        {
          label: '待审批',
          value: stats.pendingCount,
          icon: AlertCircle,
          color: 'from-purple-600 to-purple-800',
          bgLight: 'bg-purple-50',
          textColor: 'text-purple-700',
        },
      ]
    : [];

  const projectUsageData = stats?.projectUsage.map((p) => ({
    name: p.projectName,
    实际工时: p.actualHours,
    预估工时: p.estimatedHours,
  })) || [];

  const memberRankingData = stats?.memberRanking.map((m, i) => ({
    name: m.userName,
    工时: m.totalHours,
    fill: COLORS[i % COLORS.length],
  })) || [];

  const projectPieData = projects.slice(0, 6).map((p) => ({
    name: p.name,
    value: p.actual_hours || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">管理后台</h1>
          <p className="text-slate-500 mt-1">查看项目工时统计和团队投入情况</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-medium rounded-lg shadow-lg shadow-blue-700/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          新建项目
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-slate-800">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-700" />
            <h3 className="text-lg font-semibold text-slate-800">项目工时使用率</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectUsageData} barGap={8}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="预估工时" fill="#CBD5E1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="实际工时" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-800">项目工时分布</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {projectPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-800">人员投入排行</h3>
          </div>
          <div className="space-y-4">
            {memberRankingData.map((member, index) => (
              <div key={member.name} className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                    index === 0
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                      : index === 1
                      ? 'bg-gradient-to-br from-slate-300 to-slate-500'
                      : index === 2
                      ? 'bg-gradient-to-br from-amber-600 to-amber-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">{member.name}</span>
                    <span className="text-sm font-semibold text-slate-800">{member.工时}h</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${memberRankingData.length > 0 ? (member.工时 / (memberRankingData[0]?.工时 || 1)) * 100 : 0}%`,
                        backgroundColor: member.fill,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <FolderKanban className="w-5 h-5 text-purple-700" />
            <h3 className="text-lg font-semibold text-slate-800">项目状态概览</h3>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 6).map((project) => {
              const usage = project.estimated_hours > 0
                ? Math.min(100, Math.round(((project.actual_hours || 0) / project.estimated_hours) * 100))
                : 0;
              return (
                <div key={project.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-slate-700">{project.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : project.status === 'completed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {project.status === 'active' ? '进行中' : project.status === 'completed' ? '已完成' : '已归档'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          usage >= 100 ? 'bg-red-500' : usage >= 80 ? 'bg-orange-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${usage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-16 text-right">
                      {project.actual_hours || 0}/{project.estimated_hours}h ({usage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">新建项目</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">项目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="请输入项目名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">项目负责人</label>
                <select
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">请选择负责人</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">预估工时（小时）</label>
                <input
                  type="number"
                  min="1"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="请输入预估工时"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">开始日期</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">结束日期</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {submitting ? '创建中...' : '创建项目'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
