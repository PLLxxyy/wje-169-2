import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  UserCircle2,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import type { UserRole } from '@/types';

const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  manager: '负责人',
  employee: '员工',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    {
      to: '/dashboard',
      label: '管理后台',
      icon: LayoutDashboard,
      roles: ['admin'] as UserRole[],
    },
    {
      to: '/projects',
      label: '项目列表',
      icon: FolderKanban,
      roles: ['admin', 'manager', 'employee'] as UserRole[],
    },
    {
      to: '/timesheet',
      label: '工时填报',
      icon: Clock,
      roles: ['admin', 'manager', 'employee'] as UserRole[],
    },
    {
      to: '/profile',
      label: '个人中心',
      icon: UserCircle2,
      roles: ['admin', 'manager', 'employee'] as UserRole[],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-400" />
            工时管理系统
          </h1>
          <p className="text-slate-400 text-sm mt-1">Timesheet Manager</p>
        </div>

        <nav className="flex-1 py-4">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-700/30 text-white border-r-4 border-teal-400'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center font-bold text-sm">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">
                {user && roleLabels[user.role]}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              欢迎回来，{user?.name}
            </h2>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
