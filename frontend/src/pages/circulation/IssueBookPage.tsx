import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Search,
  User,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';
import { Breadcrumb } from '../../components/layout/Breadcrumb';

export const IssueBookPage: React.FC = () => {
  const navigate = useNavigate();

  // Search inputs
  const [studentSearch, setStudentSearch] = useState('');
  const [copySearch, setCopySearch] = useState('');

  // Selected entities
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [copiesList, setCopiesList] = useState<any[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<any>(null);

  const [notes, setNotes] = useState('');
  const [settings, setSettings] = useState<any>({ loanDurationDays: 14, maxBooksPerStudent: 3 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueReceipt, setIssueReceipt] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        const m = res.data.data.map;
        setSettings({
          loanDurationDays: parseInt(m.loan_duration_days || '14', 10),
          maxBooksPerStudent: parseInt(m.max_books_per_student || '3', 10),
        });
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  // Search Students
  const handleSearchStudents = async (val: string) => {
    setStudentSearch(val);
    if (!val.trim()) {
      setStudentsList([]);
      return;
    }
    try {
      const res = await api.get('/students', { params: { q: val } });
      if (res.data.success) {
        setStudentsList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Search Copies
  const handleSearchCopies = async (val: string) => {
    setCopySearch(val);
    if (!val.trim()) {
      setCopiesList([]);
      return;
    }
    try {
      const res = await api.get('/copies', { params: { q: val, status: 'Available' } });
      if (res.data.success) {
        setCopiesList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCopy) {
      setError('Please select both a student and an available book copy.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/loans/issue', {
        studentId: selectedStudent.student_id,
        copyIdentifier: selectedCopy.accession_number,
        notes,
      });

      if (res.data.success) {
        setIssueReceipt(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue book');
    } finally {
      setLoading(false);
    }
  };

  const calculateDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + (settings.loanDurationDays || 14));
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb pageTitle="Issue Book" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowUpRight className="w-6 h-6 text-emerald-600" />
          <span>Circulation: Book Issue Desk</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Verify student eligibility, select physical copy, and issue standard {settings.loanDurationDays}-day loan
        </p>
      </div>

      {issueReceipt ? (
        /* Issue Success Receipt */
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Book Issued Successfully!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Loan record #{issueReceipt.loanId} recorded and inventory status updated to Issued.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Student:</span>
              <strong className="text-slate-900">{issueReceipt.student.full_name} ({issueReceipt.student.student_reg_no})</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Book Title:</span>
              <strong className="text-slate-900">{issueReceipt.copy.title}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Accession No:</span>
              <span className="font-mono text-emerald-700 font-bold">{issueReceipt.copy.accession_number}</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-semibold text-emerald-800">
              <span>Due Date:</span>
              <span>{new Date(issueReceipt.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setIssueReceipt(null);
                setSelectedCopy(null);
                setCopySearch('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Issue Another Book
            </button>
            <button
              onClick={() => navigate('/active-loans')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              View Active Loans
            </button>
          </div>
        </div>
      ) : (
        /* Issue Form */
        <form onSubmit={handleIssue} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Select Student */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Select Borrower (Student)</span>
                </span>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {!selectedStudent ? (
                <div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type Student Reg No, Name, or Email..."
                      value={studentSearch}
                      onChange={(e) => handleSearchStudents(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {studentsList.length > 0 && (
                    <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white max-h-48 overflow-y-auto shadow-md">
                      {studentsList.map((stu) => (
                        <div
                          key={stu.student_id}
                          onClick={() => {
                            setSelectedStudent(stu);
                            setStudentsList([]);
                          }}
                          className="p-2.5 hover:bg-emerald-50/50 cursor-pointer text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{stu.full_name}</p>
                            <p className="text-[11px] text-slate-500">
                              {stu.student_reg_no} • {stu.department}
                            </p>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {stu.active_loans_count} active loans
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Student Card */
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-bold text-slate-900">
                      {selectedStudent.full_name}
                    </strong>
                    <span className="font-mono text-emerald-800 font-bold">
                      {selectedStudent.student_reg_no}
                    </span>
                  </div>
                  <p className="text-slate-600">{selectedStudent.department}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span>
                      Active Loans: <strong>{selectedStudent.active_loans_count}</strong> /{' '}
                      {selectedStudent.max_books_allowed || settings.maxBooksPerStudent}
                    </span>
                    {selectedStudent.outstanding_fines > 0 && (
                      <span className="text-rose-600 font-bold">
                        Unpaid Fine: ₹{Number(selectedStudent.outstanding_fines).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Select Copy */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Select Available Copy</span>
                </span>
                {selectedCopy && (
                  <button
                    type="button"
                    onClick={() => setSelectedCopy(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {!selectedCopy ? (
                <div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Scan barcode or type Accession Number / Title..."
                      value={copySearch}
                      onChange={(e) => handleSearchCopies(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {copiesList.length > 0 && (
                    <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white max-h-48 overflow-y-auto shadow-md">
                      {copiesList.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCopy(c);
                            setCopiesList([]);
                          }}
                          className="p-2.5 hover:bg-emerald-50/50 cursor-pointer text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{c.book_title}</p>
                            <p className="text-[11px] font-mono text-emerald-700">
                              Acc: {c.accession_number} • Condition: {c.condition}
                            </p>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                            Available
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Copy Card */
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-bold text-slate-900">
                      {selectedCopy.book_title}
                    </strong>
                    <span className="font-mono text-emerald-800 font-bold">
                      {selectedCopy.accession_number}
                    </span>
                  </div>
                  <p className="text-slate-600">{selectedCopy.book_author}</p>
                  <p className="text-[11px] text-slate-500">
                    Location: Floor {selectedCopy.floor_number} &gt; Rack {selectedCopy.rack_number} &gt; Shelf {selectedCopy.shelf_number}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Loan Period Preview & Confirmation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Loan Terms & Due Date</span>
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Duration: {settings.loanDurationDays} Days
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Issue Date (Today):</span>
                <strong className="text-slate-900 text-sm">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Calculated Due Date:</span>
                <strong className="text-emerald-700 text-sm font-bold">{calculateDueDate()}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Loan Notes / Circulation Remarks (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Standard semester loan for research project"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={loading || !selectedStudent || !selectedCopy}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>{loading ? 'Processing Issue...' : 'Confirm Book Issue'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
