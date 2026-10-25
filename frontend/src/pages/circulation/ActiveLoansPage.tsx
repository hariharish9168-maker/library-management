import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, ArrowDownLeft, AlertTriangle, BookOpen, User, MapPin } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';

export const ActiveLoansPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadActiveLoans();
  }, []);

  const loadActiveLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans/active');
      if (res.data.success) {
        setLoans(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load active loans', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = loans.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      l.book_title?.toLowerCase().includes(term) ||
      l.student_name?.toLowerCase().includes(term) ||
      l.student_reg_no?.toLowerCase().includes(term) ||
      l.accession_number?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      <Breadcrumb pageTitle="Active Loans" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <span>Active Circulation Loans</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {user?.role === 'student'
              ? 'Your currently checked out books, due dates, and live status'
              : 'All active book loans currently checked out across the library'}
          </p>
        </div>

        {hasRole('admin', 'librarian') && (
          <Link
            to="/return-book"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Process Return</span>
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by title, student name, registration number, or accession..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Fetching active loans...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No active loans found"
            description={
              user?.role === 'student'
                ? "You don't currently have any checked-out books."
                : 'There are no active loans matching your search filter.'
            }
            icon={Clock}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Accession No</th>
                  <th className="py-3 px-4">Borrower (Student)</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status & Fine</th>
                  {hasRole('admin', 'librarian') && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => {
                  const isOverdue = l.isOverdue;

                  return (
                    <tr
                      key={l.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <Link
                          to={`/books/${l.book_id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-600 block text-sm"
                        >
                          {l.book_title}
                        </Link>
                        <p className="text-[11px] text-slate-500">{l.book_author}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {l.accession_number}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{l.student_name}</p>
                        <p className="text-[11px] font-mono text-slate-500">{l.student_reg_no}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(l.issue_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'
                          }`}
                        >
                          {new Date(l.due_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isOverdue ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{l.overdueDays}d Overdue</span>
                            </span>
                            <span className="text-[11px] text-rose-600 font-semibold">
                              Est. Fine: ₹{Number(l.estimatedFine).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Active (On Time)
                          </span>
                        )}
                      </td>
                      {hasRole('admin', 'librarian') && (
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/return-book?q=${encodeURIComponent(l.accession_number)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
