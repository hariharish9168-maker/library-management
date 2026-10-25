import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, BarChart2, PieChart, Layers, BookOpen, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { Breadcrumb } from '../../components/layout/Breadcrumb';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/inventory');
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load inventory report', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async (type: 'books' | 'loans') => {
    try {
      const urlPath = type === 'books' ? '/reports/books/csv' : '/reports/loans/csv';
      const fileName =
        type === 'books'
          ? `library_catalogue_${new Date().toISOString().slice(0, 10)}.csv`
          : `circulation_loans_${new Date().toISOString().slice(0, 10)}.csv`;

      const res = await api.get(urlPath, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Failed to download CSV');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb pageTitle="Reports & Analytics" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          <span>Library Reports & Data Export</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Generate comprehensive inventory exports, audit CSV files, and inspect collection condition metrics
        </p>
      </div>

      {/* CSV Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Book Catalogue Master CSV</h3>
              <p className="text-xs text-slate-500 mt-1">
                Full export of all book titles, authors, ISBNs, publishers, categories, available copies, and total inventory counts.
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadCSV('books')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download Book Catalogue (.CSV)</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Circulation Transactions CSV</h3>
              <p className="text-xs text-slate-500 mt-1">
                Export of historical and active loan transactions, borrower registration numbers, issue/due/return timestamps, and fines.
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadCSV('loans')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Download Circulation History (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Inventory Breakdown Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Category */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            <span>Titles by Category</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {(report?.byCategory || []).map((cat: any) => (
              <div key={cat.category_name} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-700">{cat.category_name}</span>
                <span className="font-bold text-slate-900">
                  {cat.titles_count} titles ({cat.copies_count} copies)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Condition */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-600" />
            <span>Physical Condition</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {(report?.byCondition || []).map((cond: any) => (
              <div key={cond.condition} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-700">{cond.condition}</span>
                <span className="font-bold text-slate-900">{cond.count} copies</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Availability Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Inventory Status</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {(report?.byStatus || []).map((st: any) => (
              <div key={st.status} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-700">{st.status}</span>
                <span className="font-bold text-slate-900">{st.count} copies</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
