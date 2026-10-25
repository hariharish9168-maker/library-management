import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { Breadcrumb } from '../../components/layout/Breadcrumb';

export const BookFormPage: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    edition: '',
    publicationYear: '',
    categoryId: '',
    description: '',
    coverImageUrl: '',
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);
  const [initialCopiesCount, setInitialCopiesCount] = useState('1');
  const [initialShelfId, setInitialShelfId] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    if (!isEdit) {
      loadShelves();
    }
    if (isEdit) {
      loadBookDetails();
    }
  }, [id]);

  const loadShelves = async () => {
    try {
      const res = await api.get('/locations/hierarchy');
      if (res.data.success) {
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
          setInitialShelfId(String(flat[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load shelves', err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/books/categories');
      if (res.data.success) {
        setCategories(res.data.data);
        if (!isEdit && res.data.data.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: String(res.data.data[0].id) }));
        }
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadBookDetails = async () => {
    try {
      const res = await api.get(`/books/${id}`);
      if (res.data.success) {
        const b = res.data.data;
        setFormData({
          title: b.title || '',
          author: b.author || '',
          isbn: b.isbn || '',
          publisher: b.publisher || '',
          edition: b.edition || '',
          publicationYear: b.publication_year ? String(b.publication_year) : '',
          categoryId: String(b.category_id || ''),
          description: b.description || '',
          coverImageUrl: b.cover_image_url || '',
        });
      }
    } catch (err: any) {
      setError('Failed to fetch existing book details.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: any = {
      ...formData,
      categoryId: Number(formData.categoryId),
      publicationYear: formData.publicationYear ? Number(formData.publicationYear) : null,
      isbn: formData.isbn.trim() || null,
    };

    if (!isEdit) {
      payload.initialCopiesCount = Number(initialCopiesCount) || 0;
      payload.initialShelfId = initialShelfId ? Number(initialShelfId) : null;
    }

    try {
      if (isEdit) {
        await api.put(`/books/${id}`, payload);
      } else {
        await api.post('/books', payload);
      }
      navigate('/books');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save book record.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Breadcrumb pageTitle={isEdit ? 'Edit Book' : 'Add New Book'} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/books"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isEdit ? 'Edit Book Title' : 'Add New Book Title'}
            </h1>
            <p className="text-xs text-slate-500">
              {isEdit
                ? 'Update metadata and bibliographic information for this title'
                : 'Register a new book catalogue entry in the library system'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Book Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Introduction to Algorithms"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Author(s) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="e.g. Thomas H. Cormen, Charles E. Leiserson"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900 font-medium"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                ISBN (Optional)
              </label>
              <input
                type="text"
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                placeholder="9780262033848"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Publisher
              </label>
              <input
                type="text"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                placeholder="MIT Press"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Edition
              </label>
              <input
                type="text"
                value={formData.edition}
                onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                placeholder="3rd Edition"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Publication Year
              </label>
              <input
                type="number"
                min={1800}
                max={2030}
                value={formData.publicationYear}
                onChange={(e) => setFormData({ ...formData, publicationYear: e.target.value })}
                placeholder="2020"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cover Image URL (Optional)
              </label>
              <input
                type="url"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Summary
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter synopsis or curriculum coverage notes..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-900 text-xs"
            ></textarea>
          </div>

          {!isEdit && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Initial Physical Inventory & Shelving (Optional)
                </h3>
                <p className="text-[11px] text-emerald-700">
                  Automatically generate physical copy barcodes and assign them to an exact library shelf
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Copies to Generate
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={initialCopiesCount}
                    onChange={(e) => setInitialCopiesCount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designated Shelf Location
                  </label>
                  <select
                    value={initialShelfId}
                    onChange={(e) => setInitialShelfId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-emerald-500 focus:outline-none font-medium"
                  >
                    <option value="">Unassigned (Storage Room)</option>
                    {shelves.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              to="/books"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : isEdit ? 'Update Book' : 'Create Book Title'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
