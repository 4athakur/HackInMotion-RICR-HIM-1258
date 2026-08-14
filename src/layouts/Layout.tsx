import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Upload as UploadIcon, 
  PiggyBank, 
  Target, 
  MessageSquareHeart,
  LogOut,
  TrendingUp,
  LineChart,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import clsx from 'clsx';

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics', icon: LineChart, label: 'Spending Patterns' },
    { to: '/transactions', icon: Receipt, label: 'Transactions' },
    { to: '/upload', icon: UploadIcon, label: 'Import CSV' },
    { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
    { to: '/goals', icon: Target, label: 'Savings Goals' },
    { to: '/assistant', icon: MessageSquareHeart, label: 'AI Assistant' },
  ];

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex text-[#0f172a]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#e1e8ed] shadow-sm transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-[#e1e8ed]">
          <div className="w-9 h-9 rounded-xl bg-[#005b8e] text-white flex items-center justify-center mr-3 shadow-sm">
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold text-[#002b49] tracking-tight">SmartSpend</span>
          <button className="ml-auto lg:hidden text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all",
                isActive 
                  ? "bg-[#e0f2fe] text-[#005b8e] font-bold shadow-xs" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-[#002b49]"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#e1e8ed] bg-slate-50/50">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-[#005b8e] text-white flex items-center justify-center font-bold shadow-xs">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-[#002b49] truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium transition-colors text-sm"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#e1e8ed] flex items-center px-4 lg:hidden shadow-xs">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
          <span className="ml-3 text-lg font-extrabold text-[#002b49]">SmartSpend</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}