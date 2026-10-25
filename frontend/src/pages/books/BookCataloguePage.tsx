import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Layers,
  MapPin,
  Archive,
  RefreshCw,
  Eye,
  Edit,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';

export const BookCataloguePage: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [availability, setAvailability] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [search, categoryId, availability, page]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/books/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadBooks = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (search) params.q = search;
      if (categoryId) params.categoryId = categoryId;
      if (availability !== 'all') params.availability = availability;

      const res = await api.get('/books', { params });
      if (res.data.success) {
        setBooks(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load books', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (bookId: number, currentStatus: boolean) => {
    const action = currentStatus ? 'restore' : 'archive';
    if (!window.confirm(`Are you sure you want to ${action} this book? Historical loans will remain safe.`)) {
      return;
    }

    try {
      await api.patch(`/books/${bookId}/archive`, { isArchived: !currentStatus });
      loadBooks();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action} book`);
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb pageTitle="Book Catalogue" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Book Inventory & Catalogue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Search book titles, verify physical copy quantities, and check exact shelving coordinates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/find-book"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Find Location</span>
          </Link>

          {hasRole('admin', 'librarian') && (
            <Link
              to="/books/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Title</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={availability}
            onChange={(e) => {
              setAvailability(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-40 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="all">All Copies</option>
            <option value="available">Available Now</option>
            <option value="issued">Currently Issued</option>
          </select>
        </div>
      </div>

      {/* Book Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Searching catalogue records...</p>
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            title="No matching books found"
            description="Try modifying your search keywords or clearing your category filters."
            icon={BookOpen}
            actionText="Clear Filters"
            onAction={() => {
              setSearch('');
              setCategoryId('');
              setAvailability('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Title & Author</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">ISBN</th>
                  <th className="py-3.5 px-4 text-center">Total Copies</th>
                  <th className="py-3.5 px-4 text-center">Available</th>
                  <th className="py-3.5 px-4 text-center">Issued</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((b) => {
                  const avail = Number(b.available_copies || 0);
                  const total = Number(b.total_copies || 0);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-13 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                            {b.cover_image_url ? (
                              <img
                                src={b.cover_image_url}
                                alt={b.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <BookOpen className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <Link
                              to={`/books/${b.id}`}
                              className="font-semibold text-slate-900 hover:text-emerald-600 block text-sm"
                            >
                              {b.title}
                            </Link>
                            <p className="text-slate-500 text-xs">{b.author}</p>
                            {b.edition && (
                              <span className="text-[10px] text-slate-400">{b.edition}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {b.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                        {b.isbn || <span className="text-slate-400 italic">No ISBN</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {total}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            avail > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {avail}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-600">
                        {b.issued_copies || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/books/${b.id}`}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Book Details & Copies"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {hasRole('admin', 'librarian') && (
                            <>
                              <Link
                                to={`/books/${b.id}/edit`}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Book"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleArchive(b.id, b.is_archived === 1)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title={b.is_archived === 1 ? 'Restore Book' : 'Archive Book Safely'}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 text-xs text-slate-500">
            <span>
              Showing page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong> (Total: {pagination.total} titles)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
