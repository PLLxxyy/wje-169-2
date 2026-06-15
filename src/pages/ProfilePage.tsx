import { useState, useEffect } from 'react';
import {
  UserCircle2,
  CalendarDays,
  PieChart as PieIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { PersonalStats, UserRole } from '@/types';

const COLORS = ['#1E3A8A', '#0D9488', '#F97316', '#6366F1', '#EC4899', '#8B5CF6', '#10B981', '#EF4444'];

const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  manager: '负责人',
  employee: '员工',
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.stats.personal();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{
      day: number | null;
      date?: string;
      hours?: number;
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      days.push({ day: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = stats?.calendarData.find((c) => c.date === dateStr);
      days.push({
        day: d,
        date: dateStr,
        hours: dayData?.hours || 0,
      });
    }

    return days;
  };

  const getDayColor = (hours: number) => {
    if (hours === 0) return 'bg-slate-100 text-slate-400';
    if (hours < 4) return 'bg-green-100 text-green-700 border-green-200';
    if (hours < 8) return 'bg-green-300 text-green-900 border-green-400';
    return 'bg-green-500 text-white border-green-600';
  };

  const pieData = stats?.byProject.map((p) => ({
    name: p.projectName,
    value: p.hours,
    percentage: p.percentage,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
      </div>
    );
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">个人中心</h1>
        <p className="text-slate-500 mt-1">查看个人工时统计和数据</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 p-8 text-white">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-3xl font-bold shadow-xl">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-blue-200 mt-1">@{user?.username}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-white/10 text-white text-sm rounded-full backdrop-blur-sm">
                {user && roleLabels[user.role]}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">本月总工时</span>
            </div>
            <div className="text-3xl font-bold text-blue-800">{stats?.totalHours || 0}</div>
            <p className="text-sm text-blue-600 mt-1">小时</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5">
            <div className="flex items-center gap-2 text-teal-600 mb-2">
              <PieIcon className="w-5 h-5" />
              <span className="text-sm font-medium">参与项目</span>
            </div>
            <div className="text-3xl font-bold text-teal-800">{stats?.byProject.length || 0}</div>
            <p className="text-sm text-teal-600 mt-1">个项目</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">日均工时</span>
            </div>
            <div className="text-3xl font-bold text-orange-700">
              {stats?.calendarData && stats.calendarData.length > 0
                ? (stats.totalHours / stats.calendarData.length).toFixed(1)
                : 0}
            </div>
            <p className="text-sm text-orange-600 mt-1">小时/天</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-slate-800">工时日历</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <span className="font-medium text-slate-700 min-w-[120px] text-center">
                {formatMonth(currentMonth)}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {getCalendarDays().map((day, idx) => (
              <div
                key={idx}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium border transition-all ${
                  day.day === null
                    ? 'bg-transparent border-transparent'
                    : getDayColor(day.hours || 0)
                }`}
                title={day.date ? `${day.date}: ${day.hours}h` : ''}
              >
                {day.day && (
                  <>
                    <span>{day.day}</span>
                    {day.hours && day.hours > 0 && (
                      <span className="text-[10px] mt-0.5 opacity-80">{day.hours}h</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-100" />
              <span className="text-xs text-slate-500">无记录</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
              <span className="text-xs text-slate-500">{`< 4h`}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-300 border border-green-400" />
              <span className="text-xs text-slate-500">{`4-8h`}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500 border border-green-600" />
              <span className="text-xs text-slate-500">{`> 8h`}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-800">项目工时分布</h3>
          </div>

          {pieData.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center">
              <PieIcon className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-500">本月暂无工时记录</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, _name: any, props: any) => [
                      `${value} 小时 (${props.payload.percentage}%)`,
                      props.payload.name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-slate-800">本月工时分项目汇总</h3>
        </div>

        {stats?.byProject && stats.byProject.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">项目名称</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">工时</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">占比</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 w-1/3">进度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.byProject.map((project, index) => (
                  <tr key={project.projectId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-slate-800">{project.projectName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-800">
                      {project.hours} h
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600">{project.percentage}%</td>
                    <td className="py-4 px-4">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${project.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-4 px-4 text-slate-800">合计</td>
                  <td className="py-4 px-4 text-right text-lg text-blue-700">{stats.totalHours} h</td>
                  <td className="py-4 px-4 text-right text-slate-800">100%</td>
                  <td className="py-4 px-4" />
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <UserCircle2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">本月暂无工时记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
