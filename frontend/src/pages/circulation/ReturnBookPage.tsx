import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  Receipt,
  RotateCcw,
  BookOpen,
  User,
  ShieldAlert,
} from 'lucide-react';
import api from '../../api/client';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';

export const ReturnBookPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  // Return Form State
  const [conditionOnReturn, setConditionOnReturn] = useState('Good');
  const [notes, setNotes] = useState('');

  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnReceipt, setReturnReceipt] = useState<any>(null);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (term: string) => {
    if (!term.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await api.get('/loans/return-search', { params: { q: term } });
      if (res.data.success) {
        setSearchResults(res.data.data);
        if (res.data.data.length === 1) {
          setSelectedLoan(res.data.data[0]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setProcessing(true);
    setError(null);

    try {
      const res = await api.post('/loans/return', {
        loanId: selectedLoan.loan_id,
        conditionOnReturn,
        notes,
      });

      if (res.data.success) {
        setReturnReceipt(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process return');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb pageTitle="Return Book" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowDownLeft className="w-6 h-6 text-blue-600" />
          <span>Circulation: Book Return & Shelving Desk</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Find active loan by barcode, accession number, student, or title, compute overdue fines, and display designated shelving location
        </p>
      </div>

      {returnReceipt ? (
        /* Return Confirmation & Shelving Guide */
        <div className="bg-white rounded-2xl border border-blue-200 p-6 sm:p-8 shadow-sm space-y-5 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Book Return Processed Successfully!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Loan marked as Returned at {new Date(returnReceipt.returnDate).toLocaleTimeString()}
            </p>
          </div>

          {/* CRITICAL FEATURE: Designated Shelf Location Guide */}
          <div className="max-w-lg mx-auto p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-left space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Designated Physical Shelving Location:</span>
            </div>
            <p className="text-sm font-bold text-emerald-800 bg-white p-3 rounded-xl border border-emerald-200">
              {returnReceipt.designatedShelvingLocation}
            </p>
            <p className="text-[11px] text-emerald-700">
              Please shelve copy <strong className="font-mono">{returnReceipt.copyAccession}</strong> at the designated shelf coordinates above.
            </p>
          </div>

          {/* Fine Summary if Overdue */}
          {returnReceipt.overdueInfo?.isOverdue && returnReceipt.fineRecord && (
            <div className="max-w-md mx-auto p-4 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Overdue Fine Assessed:</span>
                </span>
                <span className="text-sm text-rose-700 font-bold">
                  ₹{Number(returnReceipt.fineRecord.fineAmount).toFixed(2)}
                </span>
              </div>
              <p className="text-amber-800 text-[11px]">
                {returnReceipt.overdueInfo.overdueDays} days overdue. Recorded in student fine ledger.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              onClick={() => {
                setReturnReceipt(null);
                setSelectedLoan(null);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Return Another Book
            </button>
            <Link
              to="/active-loans"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              View Active Loans
            </Link>
          </div>
        </div>
      ) : (
        /* Return Lookup & Processing */
        <div className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              1. Scan Barcode or Search Active Loan
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan copy barcode, enter accession number (e.g. ACC-1001-C), student ID, or loan ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Find Loan'}
              </button>
            </form>

            {/* Candidate Results */}
            {searchResults.length > 1 && !selectedLoan && (
              <div className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {searchResults.map((loan) => (
                  <div
                    key={loan.loan_id}
                    onClick={() => setSelectedLoan(loan)}
                    className="p-3 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-slate-900">{loan.book_title}</strong>
                      <p className="text-[11px] text-slate-500">
                        {loan.student_name} ({loan.student_reg_no}) • Acc: <span className="font-mono">{loan.accession_number}</span>
                      </p>
                    </div>
                    <span className="text-blue-600 font-semibold text-[11px]">Select &gt;</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Loan Details & Return Processing */}
          {selectedLoan && (
            <form onSubmit={handleProcessReturn} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Loan Details & Overdue Assessment
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedLoan(null)}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Clear Selected Loan
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Book & Copy Info
                    </span>
                    <strong className="text-sm font-bold text-slate-900 block">
                      {selectedLoan.book_title}
                    </strong>
                    <p className="text-slate-600">By {selectedLoan.book_author}</p>
                    <div className="flex gap-3 pt-1">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-emerald-800">
                        Acc: {selectedLoan.accession_number}
                      </span>
                      {selectedLoan.barcode && (
                        <span className="font-mono text-slate-500">
                          BC: {selectedLoan.barcode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Borrower Info
                    </span>
                    <strong className="text-sm font-bold text-slate-900 block">
                      {selectedLoan.student_name}
                    </strong>
                    <p className="text-slate-600">
                      Reg No: <span className="font-mono font-semibold">{selectedLoan.student_reg_no}</span>
                    </p>
                    <p className="text-slate-500">{selectedLoan.department}</p>
                  </div>
                </div>

                {/* Overdue Calculation Banner */}
                {selectedLoan.overdueInfo?.isOverdue ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                    <div className="flex items-center justify-between text-rose-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>OVERDUE ITEM DETECTED</span>
                      </span>
                      <span className="text-base text-rose-700">
                        ₹{Number(selectedLoan.overdueInfo.calculatedFine).toFixed(2)} Fine
                      </span>
                    </div>
                    <p className="text-rose-800 text-[11px]">
                      Due Date: <strong>{new Date(selectedLoan.due_date).toLocaleDateString()}</strong> • Overdue Duration: <strong>{selectedLoan.overdueInfo.overdueDays} days</strong>.
                      This fine will be finalized in the student ledger upon return.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Returned on schedule! No overdue fine incurred. (Due: {new Date(selectedLoan.due_date).toLocaleDateString()})</span>
                  </div>
                )}

                {/* Location to be shelved */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Designated Shelving Coordinate
                  </span>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{selectedLoan.designatedLocation}</span>
                  </div>
                </div>

                {/* Return condition & notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Physical Condition on Return
                    </label>
                    <select
                      value={conditionOnReturn}
                      onChange={(e) => setConditionOnReturn(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Good">Good (Ready for shelf)</option>
                      <option value="Worn">Worn (Normal wear)</option>
                      <option value="Damaged">Damaged (Hold for Repair/Maintenance)</option>
                      <option value="Lost">Lost / Withdrawn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Return Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional librarian notes..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{processing ? 'Processing Return...' : 'Confirm Book Return'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
