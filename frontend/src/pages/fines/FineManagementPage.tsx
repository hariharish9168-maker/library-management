import React, { useEffect, useState } from 'react';
import { Receipt, Search, CheckCircle2, DollarSign, XCircle, ShieldAlert, CreditCard } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const FineManagementPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [fines, setFines] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  // Pay Modal
  const [selectedFineForPay, setSelectedFineForPay] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [txRef, setTxRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Waive Modal
  const [selectedFineForWaive, setSelectedFineForWaive] = useState<any>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveLoading, setWaiveLoading] = useState(false);

  useEffect(() => {
    loadFines();
    if (hasRole('admin', 'librarian')) {
      loadSummary();
    }
  }, [status]);

  const loadFines = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (status !== 'all') params.status = status;

      const res = await api.get('/fines', { params });
      if (res.data.success) {
        setFines(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load fines', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get('/fines/summary');
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load fines summary', err);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFineForPay || !payAmount) return;
    setPayLoading(true);

    try {
      await api.post('/fines/pay', {
        fineId: selectedFineForPay.id,
        amount: parseFloat(payAmount),
        paymentType,
        transactionReference: txRef || undefined,
      });

      setSelectedFineForPay(null);
      setPayAmount('');
      setTxRef('');
      loadFines();
      if (hasRole('admin', 'librarian')) loadSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  };

  const handleWaive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFineForWaive) return;
    setWaiveLoading(true);

    try {
      await api.post('/fines/waive', {
        fineId: selectedFineForWaive.id,
        reason: waiveReason || 'Approved official waiver',
      });

      setSelectedFineForWaive(null);
      setWaiveReason('');
      loadFines();
      if (hasRole('admin', 'librarian')) loadSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Waive failed');
    } finally {
      setWaiveLoading(false);
    }
  };

  const filtered = fines.filter((f) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      f.book_title?.toLowerCase().includes(term) ||
      f.student_name?.toLowerCase().includes(term) ||
      f.student_reg_no?.toLowerCase().includes(term) ||
      f.accession_number?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <Breadcrumb pageTitle="Fine Management" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Receipt className="w-6 h-6 text-emerald-600" />
          <span>Overdue Fine Management & Payments</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Track calculated penalties, record cash or digital receipts, and manage approved institutional waivers
        </p>
      </div>

      {/* Summary Cards (Staff View) */}
      {hasRole('admin', 'librarian') && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Levied
            </span>
            <span className="text-xl font-bold text-slate-800">
              ₹{(summary.totalLevied || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Total Collected
            </span>
            <span className="text-xl font-bold text-emerald-700">
              ₹{(summary.totalCollected || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <span className="text-xl font-bold text-rose-700">
              ₹{(summary.totalOutstanding || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Waived
            </span>
            <span className="text-xl font-bold text-slate-700">
              ₹{(summary.totalWaived || 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search fines by book title, student name, or registration number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full md:w-40 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-700 font-medium"
        >
          <option value="all">All Fines</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially_Paid">Partially Paid</option>
          <option value="Paid">Fully Paid</option>
          <option value="Waived">Waived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Loading fine ledger records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No fines recorded"
            description="There are no overdue fine records matching your selection."
            icon={Receipt}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Fine ID</th>
                  <th className="py-3 px-4">Book Title</th>
                  {hasRole('admin', 'librarian') && <th className="py-3 px-4">Student</th>}
                  <th className="py-3 px-4">Days Overdue</th>
                  <th className="py-3 px-4">Total Levied</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  {hasRole('admin', 'librarian') && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((f) => {
                  const balance = Math.max(0, Number(f.total_amount) - Number(f.paid_amount));
                  const isUnpaid = f.status === 'Unpaid' || f.status === 'Partially_Paid';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">#{f.id}</td>
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 block truncate max-w-xs">{f.book_title}</strong>
                        <span className="font-mono text-[10px] text-emerald-700">Acc: {f.accession_number}</span>
                      </td>
                      {hasRole('admin', 'librarian') && (
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{f.student_name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{f.student_reg_no}</p>
                        </td>
                      )}
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {f.overdue_days} Days
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        ₹{Number(f.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">
                        ₹{Number(f.paid_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-600">
                        ₹{balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={f.status} size="sm" />
                      </td>
                      {hasRole('admin', 'librarian') && (
                        <td className="py-3 px-4 text-right">
                          {isUnpaid ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedFineForPay(f);
                                  setPayAmount(String(balance));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors"
                              >
                                Record Payment
                              </button>
                              <button
                                onClick={() => setSelectedFineForWaive(f)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] transition-colors"
                              >
                                Waive
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Settled</span>
                          )}
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

      {/* Pay Fine Modal */}
      {selectedFineForPay && (
        <Modal
          isOpen={!!selectedFineForPay}
          onClose={() => setSelectedFineForPay(null)}
          title="Record Fine Payment"
          subtitle={`Student: ${selectedFineForPay.student_name} (${selectedFineForPay.student_reg_no})`}
          maxWidth="sm"
        >
          <form onSubmit={handlePay} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
              <span className="text-slate-500">Outstanding Balance:</span>
              <strong className="text-rose-600 font-bold text-sm">
                ₹{(Number(selectedFineForPay.total_amount) - Number(selectedFineForPay.paid_amount)).toFixed(2)}
              </strong>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-emerald-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              >
                <option value="Cash">Cash at Counter</option>
                <option value="Online">Online / UPI Receipt</option>
              </select>
            </div>

            {paymentType === 'Online' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref No</label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="UPI/Bank Reference ID"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedFineForPay(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={payLoading}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {payLoading ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Waive Fine Modal */}
      {selectedFineForWaive && (
        <Modal
          isOpen={!!selectedFineForWaive}
          onClose={() => setSelectedFineForWaive(null)}
          title="Approve Fine Waiver"
          subtitle={`Student: ${selectedFineForWaive.student_name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleWaive} className="space-y-4 text-xs">
            <p className="text-slate-500">
              Waiving this fine will forgive the remaining balance of{' '}
              <strong className="text-slate-800">
                ₹{(Number(selectedFineForWaive.total_amount) - Number(selectedFineForWaive.paid_amount)).toFixed(2)}
              </strong>. This action is permanently logged in the audit ledger.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Waiver Reason</label>
              <input
                type="text"
                required
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="e.g. Approved medical leave / Department exemption"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedFineForWaive(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={waiveLoading}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {waiveLoading ? 'Waiving...' : 'Confirm Waiver'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
