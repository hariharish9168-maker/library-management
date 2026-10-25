import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  MapPin,
  Barcode,
  Layers,
  Plus,
  ArrowLeft,
  CheckCircle2,
  BookmarkCheck,
  Edit,
  Printer,
  Calendar,
  Building,
  AlertCircle,
  Clock,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { BarcodeDisplay } from '../../components/common/BarcodeDisplay';

export const BookDetailsPage: React.FC = () => {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add Copy Modal
  const [showAddCopyModal, setShowAddCopyModal] = useState(false);
  const [newCopyData, setNewCopyData] = useState({
    accessionNumber: '',
    barcode: '',
    shelfId: '',
    condition: 'Good',
    status: 'Available',
  });
  const [shelves, setShelves] = useState<any[]>([]);
  const [addCopyLoading, setAddCopyLoading] = useState(false);
  const [addCopyError, setAddCopyError] = useState<string | null>(null);

  // Barcode View Modal
  const [selectedBarcodeCopy, setSelectedBarcodeCopy] = useState<any>(null);

  // Reservation
  const [reserving, setReserving] = useState(false);
  const [resSuccess, setResSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadBookDetails();
    if (hasRole('admin', 'librarian')) {
      loadShelves();
    }
  }, [id]);

  const loadBookDetails = async () => {
    try {
      const res = await api.get(`/books/${id}`);
      if (res.data.success) {
        setBook(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load book details', err);
    } finally {
      setLoading(false);
    }
  };

  const loadShelves = async () => {
    try {
      const res = await api.get('/locations/hierarchy');
      if (res.data.success) {
        // Flatten shelves for easy selection
        const flat: any[] = [];
        res.data.data.forEach((fl: any) => {
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
        setShelves(flat);
        if (flat.length > 0) {
          setNewCopyData((prev) => ({ ...prev, shelfId: String(flat[0].id) }));
        }
      }
    } catch (err) {
      console.error('Failed to load shelves', err);
    }
  };

  const handleAddCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCopyError(null);
    setAddCopyLoading(true);

    try {
      const res = await api.post('/copies', {
        bookId: Number(id),
        accessionNumber: newCopyData.accessionNumber.trim(),
        barcode: newCopyData.barcode.trim() || undefined,
        shelfId: newCopyData.shelfId ? Number(newCopyData.shelfId) : null,
        condition: newCopyData.condition,
        status: newCopyData.status,
      });

      if (res.data.success) {
        setShowAddCopyModal(false);
        setNewCopyData({
          accessionNumber: '',
          barcode: '',
          shelfId: shelves[0]?.id ? String(shelves[0].id) : '',
          condition: 'Good',
          status: 'Available',
        });
        loadBookDetails();
      }
    } catch (err: any) {
      setAddCopyError(err.response?.data?.message || 'Failed to add copy');
    } finally {
      setAddCopyLoading(false);
    }
  };

  const handleReserveBook = async () => {
    setReserving(true);
    setResSuccess(null);
    try {
      const res = await api.post('/reservations', { bookId: Number(id) });
      if (res.data.success) {
        setResSuccess(res.data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reserve book');
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Book title not found.</p>
        <Link to="/books" className="text-emerald-600 font-semibold text-xs mt-2 inline-block">
          Return to Catalogue
        </Link>
      </div>
    );
  }

  const copies = book.copies || [];

  return (
    <div className="space-y-6">
      <Breadcrumb pageTitle={book.title} />

      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/books"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {book.category_name}
              </span>
              {book.edition && (
                <span className="text-xs text-slate-400 font-medium">{book.edition}</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {book.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">By {book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('admin', 'librarian') && (
            <>
              <Link
                to={`/books/${book.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Metadata</span>
              </Link>
              <button
                onClick={() => {
                  const autoAcc = `ACC-${book.id}-${Math.floor(100 + Math.random() * 900)}`;
                  setNewCopyData((prev) => ({
                    ...prev,
                    accessionNumber: autoAcc,
                    barcode: `BC-${autoAcc.replace(/-/g, '')}`,
                  }));
                  setShowAddCopyModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Physical Copy</span>
              </button>
            </>
          )}

          {user?.role === 'student' && book.availableCopies === 0 && (
            <button
              onClick={handleReserveBook}
              disabled={reserving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{reserving ? 'Reserving...' : 'Reserve Title'}</span>
            </button>
          )}
        </div>
      </div>

      {resSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resSuccess}</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        {/* Cover Image */}
        <div className="md:col-span-1">
          <div className="w-full aspect-[3/4] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="w-12 h-12" />
            )}
          </div>
        </div>

        {/* Bibliographic Info & Availability */}
        <div className="md:col-span-3 flex flex-col justify-between space-y-4">
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Copies
                </span>
                <span className="text-xl font-bold text-slate-800">{book.totalCopies}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
                  Available Now
                </span>
                <span className="text-xl font-bold text-emerald-700">{book.availableCopies}</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
                  Issued Copies
                </span>
                <span className="text-xl font-bold text-blue-700">{book.issuedCopies}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Publication Year
                </span>
                <span className="text-xl font-bold text-slate-800">
                  {book.publication_year || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <span className="text-slate-400 w-24 shrink-0 font-medium">ISBN:</span>
                <span className="font-mono text-slate-800 font-semibold">{book.isbn || 'None'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-24 shrink-0 font-medium">Publisher:</span>
                <span className="text-slate-700 font-medium">{book.publisher || 'Not recorded'}</span>
              </div>
              {book.description && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-slate-600 leading-relaxed text-xs">{book.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Physical Copies Section (Physical Book Location Tracking) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Physical Book Copies & Location Tracking</span>
            </h2>
            <p className="text-xs text-slate-500">
              Each copy possesses an authoritative accession number, barcode, condition, and designated shelf coordinate
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {copies.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-500">No physical copies added for this title yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Accession No</th>
                    <th className="py-3 px-4">Barcode</th>
                    <th className="py-3 px-4">Physical Location (Floor &gt; Sec &gt; Rack &gt; Shelf)</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {copies.map((c: any) => {
                    const hasLocation = !!c.shelf_id;
                    const locationPath = hasLocation
                      ? `${c.floor_name || `Floor ${c.floor_number}`} → ${c.section_name} (${c.section_code}) → Rack ${c.rack_number} → Shelf ${c.shelf_number}`
                      : 'Unassigned Location';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {c.accession_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {c.barcode || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin
                              className={`w-3.5 h-3.5 shrink-0 ${
                                hasLocation ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                hasLocation ? 'text-slate-800' : 'text-slate-400 italic'
                              }`}
                            >
                              {locationPath}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-600">{c.condition}</span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={c.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setSelectedBarcodeCopy({
                                  barcode: c.barcode || c.accession_number,
                                  accessionNumber: c.accession_number,
                                  bookTitle: book.title,
                                  shelfLocation: locationPath,
                                })
                              }
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View & Print Barcode Label"
                            >
                              <Barcode className="w-4 h-4" />
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

      {/* Add Copy Modal */}
      <Modal
        isOpen={showAddCopyModal}
        onClose={() => setShowAddCopyModal(false)}
        title="Add Physical Copy"
        subtitle={`Registering copy for: ${book.title}`}
        maxWidth="md"
      >
        {addCopyError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{addCopyError}</span>
          </div>
        )}

        <form onSubmit={handleAddCopy} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Accession Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newCopyData.accessionNumber}
              onChange={(e) =>
                setNewCopyData({ ...newCopyData, accessionNumber: e.target.value })
              }
              placeholder="e.g. ACC-1001-D"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Barcode (Optional)
            </label>
            <input
              type="text"
              value={newCopyData.barcode}
              onChange={(e) => setNewCopyData({ ...newCopyData, barcode: e.target.value })}
              placeholder="e.g. BC-100104"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Designated Shelf Location
            </label>
            <select
              value={newCopyData.shelfId}
              onChange={(e) => setNewCopyData({ ...newCopyData, shelfId: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-800 text-xs font-medium"
            >
              <option value="">Unassigned (Storage Room)</option>
              {shelves.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Physical Condition
              </label>
              <select
                value={newCopyData.condition}
                onChange={(e) => setNewCopyData({ ...newCopyData, condition: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Worn">Worn</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Availability Status
              </label>
              <select
                value={newCopyData.status}
                onChange={(e) => setNewCopyData({ ...newCopyData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
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
              disabled={addCopyLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
              {addCopyLoading ? 'Adding...' : 'Confirm Copy'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Barcode View Modal */}
      {selectedBarcodeCopy && (
        <Modal
          isOpen={!!selectedBarcodeCopy}
          onClose={() => setSelectedBarcodeCopy(null)}
          title="Physical Copy Barcode Label"
          subtitle={`Accession: ${selectedBarcodeCopy.accessionNumber}`}
          maxWidth="sm"
        >
          <BarcodeDisplay
            value={selectedBarcodeCopy.barcode}
            accessionNumber={selectedBarcodeCopy.accessionNumber}
            bookTitle={selectedBarcodeCopy.bookTitle}
            shelfLocation={selectedBarcodeCopy.shelfLocation}
          />
        </Modal>
      )}
    </div>
  );
};
