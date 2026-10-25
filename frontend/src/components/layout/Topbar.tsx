import React from 'react';
import { Menu, Search, Bell, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Quick search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search books, accession number, or location..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/find-book?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
              }
            }}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg bg-slate-100 border border-transparent focus:border-slate-300 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right: Status badge & User dropdown */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Physical Location Engine Active</span>
        </div>

        <button
          onClick={() => navigate('/overdue-books')}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Notifications & Overdue Alerts"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* User Info */}
        <div
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 pl-3 border-l border-slate-200 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
            {user?.fullName?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-emerald-700">
              {user?.fullName}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
