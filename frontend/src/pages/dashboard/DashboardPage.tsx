import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Layers,
  CheckCircle2,
  BookmarkCheck,
  Users,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  MapPin,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Breadcrumb } from '../../components/layout/Breadcrumb';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.get('/dashboard/stats');
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading library metrics...</p>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};

  return (
    <div className="space-y-6">
      <Breadcrumb pageTitle="Dashboard" />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Session
              </span>
              <span className="text-xs text-slate-400 capitalize">
                Role: <strong className="text-white">{user?.role}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {user?.fullName}!
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mt-1">
              Precision physical location tracking is active. Real-time rack, shelf, and floor mapping updated.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/find-book"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>Find a Book</span>
            </Link>

            {hasRole('admin', 'librarian') && (
              <>
                <Link
                  to="/issue-book"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>Issue</span>
                </Link>
                <Link
                  to="/return-book"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                  <span>Return</span>
                </Link>
                <Link
                  to="/books/new"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-purple-400" />
                  <span>Add Book</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 7 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Book Titles"
          value={s.totalTitles || 0}
          icon={BookOpen}
          color="emerald"
          subtitle="Unique catalogue entries"
        />

        <StatCard
          title="Total Physical Copies"
          value={s.totalCopies || 0}
          icon={Layers}
          color="blue"
          subtitle="Individual barcoded items"
        />

        <StatCard
          title="Available Copies"
          value={s.availableCopies || 0}
          icon={CheckCircle2}
          color="emerald"
          badge={{ text: 'Ready on Shelves', variant: 'success' }}
        />

        <StatCard
          title="Issued Copies"
          value={s.issuedCopies || 0}
          icon={BookmarkCheck}
          color="purple"
          subtitle="Currently on active loans"
        />

        <StatCard
          title="Registered Students"
          value={s.registeredStudents || 0}
          icon={Users}
          color="slate"
          subtitle="Active library borrowers"
        />

        <StatCard
          title="Overdue Loans"
          value={s.overdueLoans || 0}
          icon={AlertTriangle}
          color={s.overdueLoans > 0 ? 'rose' : 'slate'}
          badge={
            s.overdueLoans > 0
              ? { text: 'Action Required', variant: 'danger' }
              : { text: 'All Clean', variant: 'success' }
          }
        />

        <StatCard
          title="Outstanding Fines"
          value={`₹${(s.outstandingFines || 0).toFixed(2)}`}
          icon={Receipt}
          color={s.outstandingFines > 0 ? 'amber' : 'slate'}
          subtitle="Unpaid overdue penalties"
        />
      </div>

      {/* Circulation Chart & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Inventory Distribution by Category</h3>
              <p className="text-xs text-slate-500">Total physical copies vs currently issued copies</p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Detailed Report</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.categoryStats || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="total_copies" name="Total Copies" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issued_copies" name="Issued" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Floor Location Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Shelving by Floor</h3>
              <Link to="/racks-shelves" className="text-xs font-semibold text-emerald-600 hover:underline">
                View All
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Physical copies stored across building levels
            </p>

            <div className="space-y-3">
              {(data?.floorStats || []).map((fl: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {fl.floor_name}
                    </span>
                    <span className="text-emerald-700 font-bold">{fl.copies_count} copies</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          ((fl.copies_count || 0) / Math.max(1, s.totalCopies || 1)) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Need exact coordinates? Use the <strong>Find a Book</strong> search to locate Rack & Shelf instantly.</span>
          </div>
        </div>
      </div>

      {/* Recent Activity: Books & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Books */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recent Book Additions</h3>
            <Link to="/books" className="text-xs font-semibold text-emerald-600 hover:underline">
              View Catalogue
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(data?.recentBooks || []).map((b: any) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-11 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/books/${b.id}`}
                      className="text-xs font-semibold text-slate-900 hover:text-emerald-600 truncate block"
                    >
                      {b.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 truncate">{b.author}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {b.category_name}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Circulation Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recent Issues & Returns</h3>
            <Link to="/borrowing-history" className="text-xs font-semibold text-emerald-600 hover:underline">
              View History
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(data?.recentTransactions || []).map((t: any) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{t.book_title}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.student_name} • <span className="font-mono text-emerald-700">{t.accession_number}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={t.status} size="sm" />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(t.issue_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
