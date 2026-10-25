import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Search, ArrowDownLeft, Mail, Phone, Clock, Receipt } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { EmptyState } from '../../components/common/EmptyState';

export const OverdueBooksPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOverdueLoans();
  }, []);

  const loadOverdueLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans/overdue');
      if (res.data.success) {
        setLoans(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load overdue loans', err);
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

  const totalEstimatedFine = filtered.reduce((acc, l) => acc + (l.calculatedFine || 0), 0);

  return (
    <div className="space-y-5">
      <Breadcrumb pageTitle="Overdue Books" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span>Overdue Book Tracker & Penalties</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor active loans past their due date, calculated daily penalties, and borrower details
          </p>
        </div>

        {filtered.length > 0 && (
          <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto">
            <Receipt className="w-4 h-4 text-rose-600" />
            <span>Total Accruing Fines: ₹{totalEstimatedFine.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search overdue records by title, borrower name, registration number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Calculating live overdue fines...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No overdue books!"
            description="All active loans are currently within their permitted lending period."
            icon={Clock}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/50 border-b border-rose-100 text-rose-900 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Accession</th>
                  {hasRole('admin', 'librarian') && <th className="py-3 px-4">Borrower & Contact</th>}
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Days Overdue</th>
                  <th className="py-3 px-4">Daily Rate</th>
                  <th className="py-3 px-4">Accrued Fine</th>
                  {hasRole('admin', 'librarian') && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block truncate max-w-xs">{l.book_title}</strong>
                      <span className="text-[11px] text-slate-500">{l.book_author}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {l.accession_number}
                    </td>
                    {hasRole('admin', 'librarian') && (
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{l.student_name}</p>
                        <p className="text-[11px] font-mono text-slate-500">{l.student_reg_no}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          {l.student_email && (
                            <span className="flex items-center gap-0.5">
                              <Mail className="w-3 h-3" />
                              {l.student_email}
                            </span>
                          )}
                          {l.student_phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-3 h-3" />
                              {l.student_phone}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-4 font-semibold text-rose-600">
                      {new Date(l.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                        +{l.overdueDays} Days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      ₹{Number(l.fineRatePerDay).toFixed(2)}/day
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-700 text-sm">
                      ₹{Number(l.calculatedFine).toFixed(2)}
                    </td>
                    {hasRole('admin', 'librarian') && (
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/return-book?q=${encodeURIComponent(l.accession_number)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Return Now</span>
                        </Link>
                      </td>
                    )}
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
