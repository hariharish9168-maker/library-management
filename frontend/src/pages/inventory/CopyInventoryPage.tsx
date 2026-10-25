import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  MapPin,
  Barcode,
  Edit,
  Trash2,
  Printer,
  BookOpen,
  Plus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { BarcodeDisplay } from '../../components/common/BarcodeDisplay';
import { EmptyState } from '../../components/common/EmptyState';

export const CopyInventoryPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [copies, setCopies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');

  // Barcode Modal
  const [barcodeCopy, setBarcodeCopy] = useState<any>(null);

  // Add Copy Modal
  const [showAddCopyModal, setShowAddCopyModal] = useState(false);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [allShelves, setAllShelves] = useState<any[]>([]);
  const [newCopyBookId, setNewCopyBookId] = useState<number | null>(null);
  const [newCopyAcc, setNewCopyAcc] = useState('');
  const [newCopyBarcode, setNewCopyBarcode] = useState('');
  const [newCopyShelfId, setNewCopyShelfId] = useState<number | null>(null);
  const [newCopyCondition, setNewCopyCondition] = useState('Good');
  const [newCopyStatus, setNewCopyStatus] = useState('Available');
  const [addingCopy, setAddingCopy] = useState(false);
  const [addCopyError, setAddCopyError] = useState<string | null>(null);

  useEffect(() => {
    loadCopies();
  }, [search, status, condition]);

  useEffect(() => {
    if (hasRole('admin', 'librarian')) {
      loadBooksAndShelves();
    }
  }, []);

  const loadBooksAndShelves = async () => {
    try {
      const [booksRes, hierRes] = await Promise.all([
        api.get('/books', { params: { limit: 100 } }),
        api.get('/locations/hierarchy'),
      ]);

      if (booksRes.data.success) {
        setAllBooks(booksRes.data.data);
        if (booksRes.data.data.length > 0) {
          setNewCopyBookId(booksRes.data.data[0].id);
        }
      }

      if (hierRes.data.success) {
        const flat: any[] = [];
        hierRes.data.data.forEach((fl: any) => {
          fl.sections?.forEach((sec: any) => {
            sec.racks?.forEach((rk: any) => {
              rk.shelves?.forEach((sh: any) => {
                flat.push({
                  id: sh.id,
                  label: `${fl.name} > ${sec.code} > Rack ${rk.rack_number} > Shelf ${sh.shelf_number}`,
                });
              });
            });
          });
        });
        setAllShelves(flat);
        if (flat.length > 0) {
          setNewCopyShelfId(flat[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load books or shelves', err);
    }
  };

  const loadCopies = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.q = search;
      if (status) params.status = status;
      if (condition) params.condition = condition;

      const res = await api.get('/copies', { params });
      if (res.data.success) {
        setCopies(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load copies', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddCopy = () => {
    const bookId = newCopyBookId || (allBooks[0]?.id ?? 1);
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setNewCopyBookId(bookId);
    setNewCopyAcc(`ACC-${bookId}-${randNum}`);
    setNewCopyBarcode(`BC-${bookId}${randNum}`);
    setAddCopyError(null);
    setShowAddCopyModal(true);
  };

  const handleCreateCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCopyBookId || !newCopyAcc) {
      setAddCopyError('Book title and accession number are required.');
      return;
    }

    setAddingCopy(true);
    setAddCopyError(null);

    try {
      await api.post('/copies', {
        bookId: newCopyBookId,
        accessionNumber: newCopyAcc.trim().toUpperCase(),
        barcode: newCopyBarcode.trim() || undefined,
        shelfId: newCopyShelfId || null,
        condition: newCopyCondition,
        status: newCopyStatus,
      });
      setShowAddCopyModal(false);
      loadCopies();
    } catch (err: any) {
      setAddCopyError(err.response?.data?.message || 'Failed to register copy.');
    } finally {
      setAddingCopy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb pageTitle="Physical Copy Inventory" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Physical Copy Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Granular management of individual book copies, barcodes, wear condition, and shelf allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCopies}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          {hasRole('admin', 'librarian') && (
            <button
              onClick={handleOpenAddCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Physical Copy</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Accession Number, Barcode, or Title..."
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
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Issued">Issued</option>
            <option value="Reserved">Reserved</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Archived">Archived</option>
          </select>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full md:w-36 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Conditions</option>
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Worn">Worn</option>
            <option value="Damaged">Damaged</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Loading copies inventory...</p>
          </div>
        ) : copies.length === 0 ? (
          <EmptyState
            title="No physical copies found"
            description="No items match your filter criteria."
            icon={Layers}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Accession No</th>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Physical Location</th>
                  <th className="py-3.5 px-4">Barcode</th>
                  <th className="py-3.5 px-4">Condition</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {copies.map((c) => {
                  const locationPath = c.shelf_id
                    ? `${c.floor_name || `L${c.floor_number}`} > ${c.section_code} > R${c.rack_number} > S${c.shelf_number}`
                    : 'Unassigned';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {c.accession_number}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/books/${c.book_id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-600 truncate block max-w-xs"
                        >
                          {c.book_title}
                        </Link>
                        <p className="text-[11px] text-slate-500">{c.book_author}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{locationPath}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {c.barcode || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">{c.condition}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            setBarcodeCopy({
                              barcode: c.barcode || c.accession_number,
                              accessionNumber: c.accession_number,
                              bookTitle: c.book_title,
                              shelfLocation: locationPath,
                            })
                          }
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View & Print Barcode Label"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Copy Modal */}
      {showAddCopyModal && (
        <Modal
          isOpen={showAddCopyModal}
          onClose={() => setShowAddCopyModal(false)}
          title="Add Physical Copy"
          subtitle="Register an individual copy with barcode and shelf location"
          maxWidth="md"
        >
          {addCopyError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{addCopyError}</span>
            </div>
          )}

          <form onSubmit={handleCreateCopy} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Book Title <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={newCopyBookId || ''}
                onChange={(e) => {
                  const bId = Number(e.target.value);
                  setNewCopyBookId(bId);
                  const randNum = Math.floor(1000 + Math.random() * 9000);
                  setNewCopyAcc(`ACC-${bId}-${randNum}`);
                  setNewCopyBarcode(`BC-${bId}${randNum}`);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium"
              >
                {allBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Accession Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCopyAcc}
                  onChange={(e) => setNewCopyAcc(e.target.value.toUpperCase())}
                  placeholder="ACC-1001-A"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Barcode Code
                </label>
                <input
                  type="text"
                  value={newCopyBarcode}
                  onChange={(e) => setNewCopyBarcode(e.target.value.toUpperCase())}
                  placeholder="BC-100101"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shelf Location Allocation
              </label>
              <select
                value={newCopyShelfId || ''}
                onChange={(e) => setNewCopyShelfId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
              >
                <option value="">Unassigned (Storage Room / Processing)</option>
                {allShelves.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Condition
                </label>
                <select
                  value={newCopyCondition}
                  onChange={(e) => setNewCopyCondition(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Worn">Worn</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={newCopyStatus}
                  onChange={(e) => setNewCopyStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <option value="Available">Available</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddCopyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingCopy}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {addingCopy ? 'Adding...' : 'Add Physical Copy'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Barcode Modal */}
      {barcodeCopy && (
        <Modal
          isOpen={!!barcodeCopy}
          onClose={() => setBarcodeCopy(null)}
          title="Print Barcode Label"
          subtitle={`Accession: ${barcodeCopy.accessionNumber}`}
          maxWidth="sm"
        >
          <BarcodeDisplay
            value={barcodeCopy.barcode}
            accessionNumber={barcodeCopy.accessionNumber}
            bookTitle={barcodeCopy.bookTitle}
            shelfLocation={barcodeCopy.shelfLocation}
          />
        </Modal>
      )}
    </div>
  );
};
