import React, { useEffect, useState } from 'react';
import { Sliders, Save, CheckCircle2, AlertCircle, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import api from '../../api/client';
import { Breadcrumb } from '../../components/layout/Breadcrumb';

export const LibrarySettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    loan_duration_days: '14',
    max_books_per_student: '3',
    grace_period_days: '0',
    fine_rate_per_day: '2.00',
    max_fine_limit: '150.00',
    currency_symbol: '₹',
    allow_reservations: 'true',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.data.map) {
        setSettings(res.data.data.map);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setMessage('Library settings updated successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumb pageTitle="Library Settings" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-6 h-6 text-purple-600" />
          <span>Library Circulation & Overdue Policy Configuration</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Set global institutional policies for borrowing duration, fine rates, limits, and reservations
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Circulation Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Circulation & Loan Durations</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Standard Loan Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                required
                value={settings.loan_duration_days}
                onChange={(e) => setSettings({ ...settings, loan_duration_days: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default number of days a student can borrow a book.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Maximum Books Per Student
              </label>
              <input
                type="number"
                min={1}
                max={15}
                required
                value={settings.max_books_per_student}
                onChange={(e) => setSettings({ ...settings, max_books_per_student: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Maximum concurrent active loans allowed per student account.</p>
            </div>
          </div>
        </div>

        {/* Fines Policy */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>Overdue Fine Rules & Monetary Rates</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Daily Fine Rate
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  {settings.currency_symbol || '₹'}
                </span>
                <input
                  type="number"
                  step="0.25"
                  min={0}
                  required
                  value={settings.fine_rate_per_day}
                  onChange={(e) => setSettings({ ...settings, fine_rate_per_day: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 font-bold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Fine per calendar overdue day.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Grace Period (Days)
              </label>
              <input
                type="number"
                min={0}
                max={14}
                required
                value={settings.grace_period_days}
                onChange={(e) => setSettings({ ...settings, grace_period_days: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Grace days allowed before daily fines start accruing.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Maximum Fine Cap Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  {settings.currency_symbol || '₹'}
                </span>
                <input
                  type="number"
                  step="1"
                  min={0}
                  required
                  value={settings.max_fine_limit}
                  onChange={(e) => setSettings({ ...settings, max_fine_limit: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 font-bold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Upper limit cap on total fine per individual loan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                required
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Book Reservations</label>
              <select
                value={settings.allow_reservations}
                onChange={(e) => setSettings({ ...settings, allow_reservations: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
              >
                <option value="true">Enabled (Students can queue requests)</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Policies...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
