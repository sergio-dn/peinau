import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  folio: string;
  providerName: string;
  amount: number;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  paid: 'Pagado',
  review: 'En revisión',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-blue-100 text-blue-700',
  review: 'bg-purple-100 text-purple-700',
};

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 3) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/invoices/search?q=${encodeURIComponent(term)}&limit=5`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
      setHasSearched(true);
      setIsOpen(true);
    } catch {
      setError('Error al buscar');
      setResults([]);
      setHasSearched(true);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      doSearch(value);
    }, 300);
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/invoices/${result.id}`);
  };

  const showDropdown = isOpen && query.length >= 3;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md w-full">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (query.length >= 3) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              e.currentTarget.blur();
            }
          }}
          placeholder="Buscar proveedor, folio..."
          className="w-full pl-9 pr-16 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
        />
        {/* ⌘K badge */}
        {!isLoading && (
          <span className="absolute right-3 flex items-center gap-0.5 pointer-events-none">
            <kbd className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded text-slate-500">
              ⌘K
            </kbd>
          </span>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 w-4 h-4 text-slate-400 animate-spin pointer-events-none" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {error ? (
            <div className="px-4 py-3 text-sm text-red-500">{error}</div>
          ) : results.length === 0 && hasSearched && !isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => handleSelect(result)}
                    className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-800 shrink-0">
                        {result.folio}
                      </span>
                      <span className="text-slate-400 text-xs shrink-0">·</span>
                      <span className="text-sm text-slate-600 truncate">
                        {result.providerName}
                      </span>
                      <span className="text-slate-400 text-xs shrink-0">·</span>
                      <span className="text-sm text-slate-700 shrink-0">
                        {formatCLP(result.amount)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                        STATUS_COLORS[result.status] ?? 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {STATUS_LABELS[result.status] ?? result.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
