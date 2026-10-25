import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MapPin,
  Search,
  BookOpen,
  Layers,
  ArrowRight,
  Compass,
  Building,
  Navigation,
  Info,
} from 'lucide-react';
import api from '../../api/client';
import { Breadcrumb } from '../../components/layout/Breadcrumb';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';

export const FindBookPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get('/locations/find', { params: { q: searchTerm } });
      if (res.data.success) {
        setResults(res.data.data);
      }
    } catch (err) {
      console.error('Failed to search book locations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
    performSearch(query);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb pageTitle="Find a Book Location" />

      {/* Hero Search Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Physical Book Location Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Locate Any Book in the Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Enter a book title, author, ISBN, accession number, or barcode to receive the exact
            Floor, Section, Rack, and Shelf coordinates.
          </p>

          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative flex items-center shadow-xl rounded-2xl overflow-hidden bg-white">
              <Search className="w-5 h-5 text-slate-400 absolute left-4" />
              <input
                type="text"
                placeholder="e.g. Introduction to Algorithms, ACC-1001-A, or 978026..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-28 py-3.5 text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Track Location
              </button>
            </div>
          </form>

          {/* Quick suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
            <span>Try searching:</span>
            {['Algorithms', 'Database System Concepts', 'ACC-1001-A', 'Artificial Intelligence'].map(
              (sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setQuery(sug);
                    setSearchParams({ q: sug });
                    performSearch(sug);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                >
                  {sug}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {loading && (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-500">Querying library physical location database...</p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <EmptyState
            title="No physical copies found"
            description={`We couldn't locate any items matching "${query}". Double check your title or accession number.`}
            icon={MapPin}
          />
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Found {results.length} physical {results.length === 1 ? 'copy' : 'copies'} across shelves
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {results.map((copy: any) => {
                const isAvail = copy.copy_status === 'Available';

                return (
                  <div
                    key={copy.copy_id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Book & Copy Meta */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-12 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                        {copy.cover_image_url ? (
                          <img
                            src={copy.cover_image_url}
                            alt={copy.book_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-6 h-6" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {copy.category_name}
                          </span>
                          <StatusBadge status={copy.copy_status} size="sm" />
                          <span className="text-[11px] text-slate-500">
                            Condition: <strong>{copy.condition}</strong>
                          </span>
                        </div>

                        <Link
                          to={`/books/${copy.book_id}`}
                          className="text-base font-bold text-slate-900 hover:text-emerald-600 truncate block"
                        >
                          {copy.book_title}
                        </Link>

                        <p className="text-xs text-slate-500 mt-0.5">By {copy.book_author}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                          <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                            Acc: {copy.accession_number}
                          </span>
                          {copy.barcode && (
                            <span className="font-mono text-slate-500 text-[11px]">
                              Barcode: {copy.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Exact Physical Coordinates Card */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 md:w-80 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                        <Navigation className="w-4 h-4 text-emerald-600" />
                        <span>Exact Physical Location</span>
                      </div>

                      {copy.hasLocation ? (
                        <div className="space-y-1.5 text-xs">
                          {/* Hierarchical Trail */}
                          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px]">
                              {copy.floor_name || `Floor ${copy.floor_number}`}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-800 text-[11px]">
                              {copy.section_code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700 pt-1 font-medium">
                            <span className="font-bold text-slate-900">
                              Rack {copy.rack_number}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Shelf {copy.shelf_number}
                            </span>
                          </div>

                          {copy.shelf_desc && (
                            <p className="text-[11px] text-slate-500 pt-1 italic">
                              "{copy.shelf_desc}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-amber-50 text-amber-800 text-xs">
                          Not assigned to a shelf. Currently at the reception/sorting desk.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
