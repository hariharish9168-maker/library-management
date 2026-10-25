import React, { useEffect, useState } from 'react';
import {
  Library,
  Layers,
  MapPin,
  Plus,
  ChevronRight,
  BookOpen,
  ArrowRightLeft,
  X,
  Info,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  Box,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const RackShelfPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected shelf to inspect its books
  const [selectedShelf, setSelectedShelf] = useState<any>(null);
  const [shelfBooks, setShelfBooks] = useState<any>(null);
  const [loadingShelfBooks, setLoadingShelfBooks] = useState(false);

  // Transfer Copy Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferCopyId, setTransferCopyId] = useState<number | null>(null);
  const [transferTargetShelfId, setTransferTargetShelfId] = useState<number | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Modals & Forms State
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 1. Add Floor Modal
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [newFloorNumber, setNewFloorNumber] = useState('4');
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorDesc, setNewFloorDesc] = useState('');

  // 2. Add Section Modal
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [targetFloorId, setTargetFloorId] = useState<number | null>(null);
  const [newSectionCode, setNewSectionCode] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  // 3. Add Rack Modal
  const [showAddRackModal, setShowAddRackModal] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
  const [newRackNumber, setNewRackNumber] = useState('');
  const [newRackDesc, setNewRackDesc] = useState('');

  // 4. Add Shelf Modal
  const [showAddShelfModal, setShowAddShelfModal] = useState(false);
  const [targetRackId, setTargetRackId] = useState<number | null>(null);
  const [newShelfNumber, setNewShelfNumber] = useState('');
  const [newShelfCapacity, setNewShelfCapacity] = useState('30');
  const [newShelfDesc, setNewShelfDesc] = useState('');

  useEffect(() => {
    loadHierarchy();
  }, []);

  const loadHierarchy = async () => {
    setLoading(true);
    try {
      const res = await api.get('/locations/hierarchy');
      if (res.data.success) {
        setHierarchy(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load hierarchy', err);
    } finally {
      setLoading(false);
    }
  };

  const inspectShelf = async (shelf: any) => {
    setSelectedShelf(shelf);
    setLoadingShelfBooks(true);
    try {
      const res = await api.get(`/locations/shelf/${shelf.id}/books`);
      if (res.data.success) {
        setShelfBooks(res.data);
      }
    } catch (err) {
      console.error('Failed to load books in shelf', err);
    } finally {
      setLoadingShelfBooks(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferCopyId || !transferTargetShelfId) return;
    setTransferring(true);
    try {
      await api.post('/locations/transfer', {
        copyId: transferCopyId,
        targetShelfId: transferTargetShelfId,
      });
      setShowTransferModal(false);
      loadHierarchy();
      if (selectedShelf) {
        inspectShelf(selectedShelf);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  // Create Floor
  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      await api.post('/locations/floors', {
        floorNumber: Number(newFloorNumber),
        name: newFloorName.trim(),
        description: newFloorDesc.trim() || null,
      });
      setShowAddFloorModal(false);
      setNewFloorName('');
      setNewFloorDesc('');
      loadHierarchy();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create floor level');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFloorId) {
      setModalError('Please select a target floor.');
      return;
    }
    setSubmitting(true);
    setModalError(null);

    try {
      await api.post('/locations/sections', {
        floorId: targetFloorId,
        code: newSectionCode.trim().toUpperCase(),
        name: newSectionName.trim(),
        description: newSectionDesc.trim() || null,
      });
      setShowAddSectionModal(false);
      setNewSectionCode('');
      setNewSectionName('');
      setNewSectionDesc('');
      loadHierarchy();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create department section');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Rack
  const handleCreateRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId) {
      setModalError('Please select a target section.');
      return;
    }
    setSubmitting(true);
    setModalError(null);

    try {
      await api.post('/locations/racks', {
        sectionId: targetSectionId,
        rackNumber: newRackNumber.trim().toUpperCase(),
        description: newRackDesc.trim() || null,
      });
      setShowAddRackModal(false);
      setNewRackNumber('');
      setNewRackDesc('');
      loadHierarchy();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create rack structure');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Shelf
  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRackId || !newShelfNumber) {
      setModalError('Rack ID and Shelf Number are required.');
      return;
    }
    setSubmitting(true);
    setModalError(null);

    try {
      await api.post('/locations/shelves', {
        rackId: targetRackId,
        shelfNumber: newShelfNumber.trim().toUpperCase(),
        capacity: Number(newShelfCapacity) || 30,
        description: newShelfDesc.trim() || null,
      });
      setShowAddShelfModal(false);
      setNewShelfNumber('');
      setNewShelfDesc('');
      loadHierarchy();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create shelf');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Flatten all shelves for transfer dropdown
  const allShelves: any[] = [];
  hierarchy.forEach((f) => {
    f.sections?.forEach((sec: any) => {
      sec.racks?.forEach((rk: any) => {
        rk.shelves?.forEach((sh: any) => {
          allShelves.push({
            id: sh.id,
            label: `${f.name} > ${sec.code} > Rack ${rk.rack_number} > Shelf ${sh.shelf_number}`,
          });
        });
      });
    });
  });

  return (
    <div className="space-y-6">
      <Breadcrumb pageTitle="Rack & Shelf Management" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Physical Location Hierarchy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Interactive floor plan, section divisions, rack structures, and individual shelf capacities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHierarchy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors"
            title="Refresh Hierarchy"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          {hasRole('admin', 'librarian') && (
            <button
              onClick={() => {
                setModalError(null);
                setNewFloorNumber(String(hierarchy.length + 1));
                setNewFloorName(`Floor ${hierarchy.length + 1} (${hierarchy.length === 3 ? 'Third Floor' : `Level ${hierarchy.length + 1}`})`);
                setShowAddFloorModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Floor</span>
            </button>
          )}
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="space-y-6">
        {hierarchy.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">No floors defined yet in physical library layout.</p>
            {hasRole('admin', 'librarian') && (
              <button
                onClick={() => setShowAddFloorModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Add First Floor
              </button>
            )}
          </div>
        ) : (
          hierarchy.map((floor) => (
            <div
              key={floor.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Floor Header */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-xs font-bold">
                    L{floor.floor_number}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{floor.name}</h3>
                    <p className="text-[11px] text-slate-400">{floor.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                    {floor.sections?.length || 0} Sections
                  </span>

                  {hasRole('admin', 'librarian') && (
                    <button
                      onClick={() => {
                        setTargetFloorId(floor.id);
                        setModalError(null);
                        setNewSectionCode('');
                        setNewSectionName('');
                        setNewSectionDesc('');
                        setShowAddSectionModal(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                      title="Add Section to this Floor"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>Add Section</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sections in Floor */}
              <div className="p-5 space-y-5">
                {(floor.sections || []).length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                    <p className="text-xs text-slate-500">No sections added to {floor.name} yet.</p>
                    {hasRole('admin', 'librarian') && (
                      <button
                        onClick={() => {
                          setTargetFloorId(floor.id);
                          setShowAddSectionModal(true);
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Section to Floor</span>
                      </button>
                    )}
                  </div>
                ) : (
                  (floor.sections || []).map((sec: any) => (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-800">
                            {sec.name} ({sec.code})
                          </span>
                          {sec.description && (
                            <p className="text-[11px] text-slate-500">{sec.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500">
                            {sec.racks?.length || 0} Racks
                          </span>
                          {hasRole('admin', 'librarian') && (
                            <button
                              onClick={() => {
                                setTargetSectionId(sec.id);
                                setNewRackNumber(`R0${(sec.racks?.length || 0) + 1}`);
                                setNewRackDesc('');
                                setModalError(null);
                                setShowAddRackModal(true);
                              }}
                              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors"
                              title="Add Rack to this Section"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Rack</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Racks in Section */}
                      {(sec.racks || []).length === 0 ? (
                        <div className="p-4 rounded-lg bg-white border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-400">No racks added in this section yet.</p>
                          {hasRole('admin', 'librarian') && (
                            <button
                              onClick={() => {
                                setTargetSectionId(sec.id);
                                setNewRackNumber(`R01`);
                                setNewRackDesc('');
                                setModalError(null);
                                setShowAddRackModal(true);
                              }}
                              className="text-xs font-semibold text-emerald-600 hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add First Rack (R01)</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(sec.racks || []).map((rack: any) => (
                            <div
                              key={rack.id}
                              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                  Rack {rack.rack_number}
                                </span>
                                {hasRole('admin', 'librarian') && (
                                  <button
                                    onClick={() => {
                                      setTargetRackId(rack.id);
                                      setNewShelfNumber(
                                        `S0${(rack.shelves?.length || 0) + 1}`
                                      );
                                      setNewShelfCapacity('30');
                                      setNewShelfDesc('');
                                      setModalError(null);
                                      setShowAddShelfModal(true);
                                    }}
                                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Shelf</span>
                                  </button>
                                )}
                              </div>

                              {rack.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                  {rack.description}
                                </p>
                              )}

                              {/* Shelves List */}
                              <div className="space-y-1.5 pt-1">
                                {(rack.shelves || []).length === 0 ? (
                                  <div className="py-2 text-center text-[11px] text-slate-400 border border-dashed border-slate-100 rounded-lg">
                                    No shelves on this rack
                                  </div>
                                ) : (
                                  (rack.shelves || []).map((shelf: any) => {
                                    const count = Number(shelf.current_book_count || 0);
                                    const cap = Number(shelf.capacity || 30);
                                    const isFull = count >= cap;

                                    return (
                                      <button
                                        key={shelf.id}
                                        onClick={() => inspectShelf(shelf)}
                                        className="w-full text-left p-2 rounded-lg border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors flex items-center justify-between group"
                                      >
                                        <div>
                                          <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700">
                                            Shelf {shelf.shelf_number}
                                          </span>
                                          <p className="text-[10px] text-slate-400 line-clamp-1">
                                            {shelf.description || 'General shelf'}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              isFull
                                                ? 'bg-rose-100 text-rose-800'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}
                                          >
                                            {count}/{cap}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspect Shelf Modal (View books stored on shelf) */}
      {selectedShelf && (
        <Modal
          isOpen={!!selectedShelf}
          onClose={() => {
            setSelectedShelf(null);
            setShelfBooks(null);
          }}
          title={`Books on Shelf ${selectedShelf.shelf_number}`}
          subtitle={`Capacity: ${shelfBooks?.capacity || selectedShelf.capacity} • Current: ${
            shelfBooks?.totalCopies || 0
          } books`}
          maxWidth="lg"
        >
          {loadingShelfBooks ? (
            <div className="py-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : shelfBooks?.copies?.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              This shelf is currently empty.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {shelfBooks?.copies?.map((c: any) => (
                <div
                  key={c.copy_id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.book_title}</p>
                    <p className="text-[11px] text-slate-500">{c.book_author}</p>
                    <span className="font-mono text-[10px] text-emerald-700 font-bold">
                      {c.accession_number}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.status} size="sm" />
                    {hasRole('admin', 'librarian') && (
                      <button
                        onClick={() => {
                          setTransferCopyId(c.copy_id);
                          setShowTransferModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Transfer copy to another shelf"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Transfer Copy Modal */}
      {showTransferModal && (
        <Modal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          title="Transfer Book to New Shelf"
          subtitle="Reassign the physical shelf location coordinates"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Destination Shelf
              </label>
              <select
                onChange={(e) => setTransferTargetShelfId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Choose shelf...</option>
                {allShelves.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferring || !transferTargetShelfId}
                onClick={handleTransfer}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {transferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 1. Add Floor Modal */}
      {showAddFloorModal && (
        <Modal
          isOpen={showAddFloorModal}
          onClose={() => setShowAddFloorModal(false)}
          title="Add New Floor"
          subtitle="Create a new level in the library building layout"
          maxWidth="sm"
        >
          {modalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{modalError}</span>
            </div>
          )}

          <form onSubmit={handleCreateFloor} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Floor Level Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={20}
                value={newFloorNumber}
                onChange={(e) => setNewFloorNumber(e.target.value)}
                placeholder="4"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Floor Name / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder="e.g. Floor 4 (Research & Media Lab)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Description / Purpose
              </label>
              <input
                type="text"
                value={newFloorDesc}
                onChange={(e) => setNewFloorDesc(e.target.value)}
                placeholder="e.g. Digital Media, Seminar Rooms & Archives"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddFloorModal(false)}
                className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Floor'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Add Section Modal */}
      {showAddSectionModal && (
        <Modal
          isOpen={showAddSectionModal}
          onClose={() => setShowAddSectionModal(false)}
          title="Add Department Section"
          subtitle="Group racks under a specific subject division"
          maxWidth="sm"
        >
          {modalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{modalError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSection} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Floor Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetFloorId || ''}
                onChange={(e) => setTargetFloorId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium"
              >
                <option value="">Select floor...</option>
                {hierarchy.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    L{fl.floor_number} - {fl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Section Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newSectionCode}
                onChange={(e) => setNewSectionCode(e.target.value.toUpperCase())}
                placeholder="e.g. AI-SEC or BIO-SEC"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Section Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g. Artificial Intelligence & Robotics"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Description / Coverage
              </label>
              <input
                type="text"
                value={newSectionDesc}
                onChange={(e) => setNewSectionDesc(e.target.value)}
                placeholder="e.g. Machine Learning, Deep Neural Networks"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Section'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Add Rack Modal */}
      {showAddRackModal && (
        <Modal
          isOpen={showAddRackModal}
          onClose={() => setShowAddRackModal(false)}
          title="Add Rack to Section"
          subtitle="Provision a physical book rack structure"
          maxWidth="sm"
        >
          {modalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{modalError}</span>
            </div>
          )}

          <form onSubmit={handleCreateRack} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Section <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetSectionId || ''}
                onChange={(e) => setTargetSectionId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium"
              >
                <option value="">Select section...</option>
                {hierarchy.map((fl) =>
                  fl.sections?.map((sec: any) => (
                    <option key={sec.id} value={sec.id}>
                      {fl.name} &gt; {sec.code} ({sec.name})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rack Number / Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newRackNumber}
                onChange={(e) => setNewRackNumber(e.target.value.toUpperCase())}
                placeholder="e.g. R04"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rack Description / Scope
              </label>
              <input
                type="text"
                value={newRackDesc}
                onChange={(e) => setNewRackDesc(e.target.value)}
                placeholder="e.g. Deep Learning & Computer Vision Textbooks"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddRackModal(false)}
                className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Rack'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Add Shelf Modal */}
      {showAddShelfModal && (
        <Modal
          isOpen={showAddShelfModal}
          onClose={() => setShowAddShelfModal(false)}
          title="Add Shelf to Rack"
          subtitle="Define shelf coordinate, tier height, and book storage capacity"
          maxWidth="sm"
        >
          {modalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{modalError}</span>
            </div>
          )}

          <form onSubmit={handleCreateShelf} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Rack <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetRackId || ''}
                onChange={(e) => setTargetRackId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium"
              >
                <option value="">Select rack...</option>
                {hierarchy.map((fl) =>
                  fl.sections?.map((sec: any) =>
                    sec.racks?.map((rk: any) => (
                      <option key={rk.id} value={rk.id}>
                        {fl.name} &gt; {sec.code} &gt; Rack {rk.rack_number}
                      </option>
                    ))
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Shelf Number / Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newShelfNumber}
                onChange={(e) => setNewShelfNumber(e.target.value.toUpperCase())}
                placeholder="e.g. S02 or S04"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Book Capacity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={200}
                value={newShelfCapacity}
                onChange={(e) => setNewShelfCapacity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Description / Tier
              </label>
              <input
                type="text"
                value={newShelfDesc}
                onChange={(e) => setNewShelfDesc(e.target.value)}
                placeholder="e.g. Middle Tier - Microcontroller & Embedded Systems"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddShelfModal(false)}
                className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Shelf'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
