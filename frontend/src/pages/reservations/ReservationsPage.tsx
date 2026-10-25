import React, { useEffect, useState } from 'react';
import { BookmarkCheck, Clock, CheckCircle, XCircle, Search, BookOpen, User } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';

export const ReservationsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reservations');
      if (res.data.success) {
        setReservations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load reservations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await api.patch(`/reservations/${id}/cancel`);
      loadReservations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel reservation');
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb pageTitle="Book Reservations" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookmarkCheck className="w-6 h-6 text-emerald-600" />
          <span>Book Reservation Requests</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {user?.role === 'student'
            ? 'Your active reservation queue positions for currently checked-out book titles'
            : 'Pending student reservation queue and title fulfillment tracking'}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Loading reservation requests...</p>
          </div>
        ) : reservations.length === 0 ? (
          <EmptyState
            title="No active reservations"
            description={
              user?.role === 'student'
                ? 'You have not reserved any unavailable books. Browse the catalogue to find titles.'
                : 'There are currently no pending reservation requests.'
            }
            icon={BookmarkCheck}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  {hasRole('admin', 'librarian') && <th className="py-3 px-4">Student</th>}
                  <th className="py-3 px-4">Queue Position</th>
                  <th className="py-3 px-4">Reserved Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block truncate max-w-xs">{r.book_title}</strong>
                      <span className="text-[11px] text-slate-500">{r.book_author}</span>
                    </td>
                    {hasRole('admin', 'librarian') && (
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{r.student_name}</p>
                        <p className="text-[11px] font-mono text-slate-500">{r.student_reg_no}</p>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                        Queue #{r.queue_order}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(r.reserved_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'Pending' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold text-[11px] transition-colors"
                        >
                          Cancel
                        </button>
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
