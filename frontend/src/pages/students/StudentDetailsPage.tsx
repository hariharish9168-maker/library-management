import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, ArrowLeft, BookOpen, Clock, Receipt, Mail, Phone, Building2, Calendar, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';

export const StudentDetailsPage: React.FC = () => {
  const { id } = useParams();
  const { user, hasRole } = useAuth();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/students/${id}`);
      if (res.data.success) {
        setStudent(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-rose-600 font-semibold text-sm">{error || 'Student not found'}</p>
        <Link to="/students" className="text-xs text-emerald-600 font-bold hover:underline inline-block">
          Return to Student Directory
        </Link>
      </div>
    );
  }

  const activeLoans = student.activeLoans || [];
  const outstandingFines = student.outstandingFines || [];

  return (
    <div className="space-y-6">
      <Breadcrumb pageTitle={student.full_name} />

      {/* Header */}
      <div className="flex items-center gap-3">
        {hasRole('admin', 'librarian') && (
          <Link
            to="/students"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {student.full_name}
          </h1>
          <p className="text-xs text-slate-500 font-mono">Reg No: {student.student_reg_no}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
            {student.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{student.full_name}</h3>
            <span className="text-xs text-slate-500">{student.email}</span>
            <div className="mt-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  student.student_active === 1
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {student.student_active === 1 ? 'Active Account' : 'Deactivated'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
          <div className="flex items-center gap-2 text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Department: <strong>{student.department}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Academic Year: <strong>{student.academic_year}</strong></span>
          </div>
          {student.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>Contact: <strong>{student.phone}</strong></span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 flex flex-col justify-center">
          <div className="flex justify-between">
            <span className="text-slate-500">Active Checked Out:</span>
            <strong className="text-slate-800">{activeLoans.length} books</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Borrowing Limit:</span>
            <strong className="text-slate-800">{student.max_books_allowed || 3} books max</strong>
          </div>
        </div>
      </div>

      {/* Current Active Loans */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Current Active Loans ({activeLoans.length})</span>
        </h3>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {activeLoans.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No active loans checked out currently.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeLoans.map((l: any) => (
                <div key={l.loan_id} className="p-4 flex items-center justify-between text-xs gap-3">
                  <div>
                    <Link
                      to={`/books/${l.book_id}`}
                      className="font-bold text-slate-900 hover:text-emerald-600 text-sm block"
                    >
                      {l.book_title}
                    </Link>
                    <p className="text-slate-500">{l.book_author}</p>
                    <span className="font-mono text-emerald-700 font-bold mt-1 inline-block">
                      Acc: {l.accession_number}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block">Due Date:</span>
                    <strong className="text-slate-800 text-xs">
                      {new Date(l.due_date).toLocaleDateString()}
                    </strong>
                    {hasRole('admin', 'librarian') && (
                      <div className="mt-1">
                        <Link
                          to={`/return-book?q=${encodeURIComponent(l.accession_number)}`}
                          className="text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          Process Return &gt;
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outstanding Fines */}
      {outstandingFines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-600" />
            <span>Unpaid Fines ({outstandingFines.length})</span>
          </h3>

          <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden divide-y divide-slate-100">
            {outstandingFines.map((f: any) => (
              <div key={f.fine_id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <strong className="text-slate-900">{f.book_title}</strong>
                  <p className="text-slate-500 text-[11px]">Overdue Penalty</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-rose-600">
                    ₹{Number(f.balance).toFixed(2)}
                  </span>
                  <p className="text-[10px] text-slate-400 capitalize">{f.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
