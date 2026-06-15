import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const { login, isAuthenticated, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!username || !password) {
      setLocalError('请输入用户名和密码');
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
    } catch {
      // error handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (user: string, pwd: string) => {
    setUsername(user);
    setPassword(pwd);
    setLocalError('');
    clearError();
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-teal-400 rounded-full filter blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl" />
        </div>
        <div className="relative z-10 text-white p-12 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-2xl">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">工时管理系统</h1>
              <p className="text-slate-300 mt-1">Timesheet Manager</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-4">高效管理项目工时</h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            一站式项目工时管理平台，从项目创建、任务拆分到工时填报与审批，
            帮助团队精准追踪人力投入，提升项目管理效率。
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-200">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <span>多角色权限管理：管理员、负责人、员工</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <span>可视化工时统计与进度追踪</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <span>工时审批流程与锁定机制</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">登录账户</h2>
          <p className="text-slate-500 mb-8">请输入您的账号信息以继续</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {(error || localError) && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error || localError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-700/25 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-3">测试账号（密码均为 123456）：</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fillCredentials('admin', '123456')}
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-left"
              >
                管理员：admin
              </button>
              <button
                onClick={() => fillCredentials('manager1', '123456')}
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-left"
              >
                负责人：manager1
              </button>
              <button
                onClick={() => fillCredentials('employee1', '123456')}
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-left"
              >
                员工：employee1
              </button>
              <button
                onClick={() => fillCredentials('employee2', '123456')}
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-left"
              >
                员工：employee2
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
