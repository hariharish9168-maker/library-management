import React, { useEffect, useState } from 'react';
import { History, Search, Download, Filter, BookOpen, User, Calendar } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';

export const BorrowingHistoryPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadHistory();
  }, [status]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (status !== 'all') params.status = status;

      const res = await api.get('/loans/history', { params });
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/reports/loans/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `borrowing_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Failed to download CSV');
    }
  };

  const filtered = history.filter((item) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      item.book_title?.toLowerCase().includes(term) ||
      item.student_name?.toLowerCase().includes(term) ||
      item.student_reg_no?.toLowerCase().includes(term) ||
      item.accession_number?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      <Breadcrumb pageTitle="Borrowing History" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            <span>Borrowing & Circulation History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {user?.role === 'student'
              ? 'Complete record of your past and current library loans and returned items'
              : 'Permanent audit ledger of all issue, due, and return transactions'}
          </p>
        </div>

        {hasRole('admin', 'librarian') && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Transactions (CSV)</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, student name, reg number, or accession..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full md:w-44 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-700 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active Loans</option>
          <option value="Returned">Returned</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Loading historical transaction records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No loan transactions found"
            description="No borrowing records match your current criteria."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Loan ID</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Accession</th>
                  {hasRole('admin', 'librarian') && <th className="py-3 px-4">Borrower</th>}
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Return Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">#{item.id}</td>
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block truncate max-w-xs">
                        {item.book_title}
                      </strong>
                      <span className="text-[11px] text-slate-500">{item.book_author}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {item.accession_number}
                    </td>
                    {hasRole('admin', 'librarian') && (
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.student_name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{item.student_reg_no}</p>
                      </td>
                    )}
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(item.issue_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(item.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.return_date ? (
                        new Date(item.return_date).toLocaleDateString()
                      ) : (
                        <span className="text-slate-400 italic">Not returned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.fine_amount ? (
                        <div>
                          <span className="font-bold text-rose-600">
                            ₹{Number(item.fine_amount).toFixed(2)}
                          </span>
                          <p className="text-[10px] text-slate-400 capitalize">{item.fine_status}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
