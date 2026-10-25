import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, CheckCircle, XCircle, Eye, AlertTriangle, ShieldCheck, Mail, Phone } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { EmptyState } from '../../components/common/EmptyState';

export const StudentListPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    loadStudents();
  }, [department, status]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (department !== 'all') params.department = department;
      if (status !== 'all') params.status = status;

      const res = await api.get('/students', { params });
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (studentId: number, currentActive: boolean) => {
    const action = currentActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this student borrower account?`)) {
      return;
    }

    try {
      await api.patch(`/students/${studentId}/status`, { isActive: !currentActive });
      loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update student status');
    }
  };

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.student_reg_no?.toLowerCase().includes(term) ||
      s.department?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      <Breadcrumb pageTitle="Student Directory" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-600" />
          <span>Student Borrower Accounts</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Search student records, verify active borrowing limits, enforce restrictions, and manage borrower status
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, email, or registration number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-36 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Loading student directory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No students found"
            description="No student borrower accounts match your query."
            icon={Users}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Registration No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department & Year</th>
                  <th className="py-3 px-4 text-center">Active Loans</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Unpaid Fines</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const isActive = s.student_active === 1 && s.user_active === 1;
                  const activeCount = Number(s.active_loans_count || 0);
                  const overdueCount = Number(s.overdue_loans_count || 0);
                  const fineBalance = Number(s.outstanding_fines || 0);

                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {s.student_reg_no}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/students/${s.student_id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-600 block"
                        >
                          {s.full_name}
                        </Link>
                        <p className="text-[11px] text-slate-500">{s.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800 font-medium">{s.department}</p>
                        <span className="text-[10px] text-slate-400">{s.academic_year}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            activeCount > 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
                          }`}
                        >
                          {activeCount} / {s.max_books_allowed || 3}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {overdueCount > 0 ? (
                          <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                            {overdueCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {fineBalance > 0 ? (
                          <span className="font-bold text-rose-600">
                            ₹{fineBalance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          <span>{isActive ? 'Active' : 'Deactivated'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/students/${s.student_id}`}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Student Profile & Loan Ledger"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleToggleStatus(s.student_id, isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Deactivate Student Account' : 'Reactivate Student Account'}
                          >
                            {isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
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
