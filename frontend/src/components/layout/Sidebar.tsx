import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  MapPin,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  History,
  AlertTriangle,
  Receipt,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Sliders,
  User,
  BookmarkCheck,
  Library,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, hasRole } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/40">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                SmartLib
              </span>
              <p className="text-[11px] font-medium text-emerald-400 -mt-0.5 tracking-wide">
                Location Tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Card */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {user?.fullName || 'User'}
            </p>
            <span
              className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                user?.role === 'admin'
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
                  : user?.role === 'librarian'
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                  : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
              }`}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Main */}
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Overview
            </p>
            <div className="space-y-1">
              <NavLink to="/dashboard" className={navItemClass} onClick={() => onClose()}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>
            </div>
          </div>

          {/* Catalog & Location Hierarchy */}
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Catalog & Location
            </p>
            <div className="space-y-1">
              <NavLink to="/books" className={navItemClass} onClick={() => onClose()}>
                <BookOpen className="w-4 h-4" />
                <span>Book Catalogue</span>
              </NavLink>

              <NavLink to="/find-book" className={navItemClass} onClick={() => onClose()}>
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="flex-1">Find a Book</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                  GPS
                </span>
              </NavLink>

              {hasRole('admin', 'librarian') && (
                <>
                  <NavLink to="/copies" className={navItemClass} onClick={() => onClose()}>
                    <Layers className="w-4 h-4" />
                    <span>Copy Inventory</span>
                  </NavLink>
                  <NavLink to="/racks-shelves" className={navItemClass} onClick={() => onClose()}>
                    <Library className="w-4 h-4" />
                    <span>Racks & Shelves</span>
                  </NavLink>
                </>
              )}
            </div>
          </div>

          {/* Circulation */}
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Circulation
            </p>
            <div className="space-y-1">
              {hasRole('admin', 'librarian') && (
                <>
                  <NavLink to="/issue-book" className={navItemClass} onClick={() => onClose()}>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    <span>Issue Book</span>
                  </NavLink>
                  <NavLink to="/return-book" className={navItemClass} onClick={() => onClose()}>
                    <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                    <span>Return Book</span>
                  </NavLink>
                </>
              )}

              <NavLink to="/active-loans" className={navItemClass} onClick={() => onClose()}>
                <Clock className="w-4 h-4" />
                <span>Active Loans</span>
              </NavLink>

              <NavLink to="/borrowing-history" className={navItemClass} onClick={() => onClose()}>
                <History className="w-4 h-4" />
                <span>Borrowing History</span>
              </NavLink>

              <NavLink to="/overdue-books" className={navItemClass} onClick={() => onClose()}>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Overdue Books</span>
              </NavLink>
            </div>
          </div>

          {/* Fines & Community */}
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Fines & Students
            </p>
            <div className="space-y-1">
              <NavLink to="/fines" className={navItemClass} onClick={() => onClose()}>
                <Receipt className="w-4 h-4" />
                <span>Fines & Payments</span>
              </NavLink>

              {hasRole('admin', 'librarian') && (
                <NavLink to="/students" className={navItemClass} onClick={() => onClose()}>
                  <Users className="w-4 h-4" />
                  <span>Student Directory</span>
                </NavLink>
              )}

              <NavLink to="/reservations" className={navItemClass} onClick={() => onClose()}>
                <BookmarkCheck className="w-4 h-4" />
                <span>Book Reservations</span>
              </NavLink>

              {hasRole('admin', 'librarian') && (
                <NavLink to="/reports" className={navItemClass} onClick={() => onClose()}>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Reports & CSV</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* Administration (Admin only) */}
          {hasRole('admin') && (
            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Administration
              </p>
              <div className="space-y-1">
                <NavLink to="/admin/staff" className={navItemClass} onClick={() => onClose()}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Staff & Roles</span>
                </NavLink>
                <NavLink to="/admin/settings" className={navItemClass} onClick={() => onClose()}>
                  <Sliders className="w-4 h-4" />
                  <span>Library Settings</span>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <NavLink to="/profile" className={navItemClass} onClick={() => onClose()}>
            <User className="w-4 h-4" />
            <span>Profile Settings</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
