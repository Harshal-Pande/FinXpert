'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, User } from 'lucide-react';
import { listClients, type Client } from '@/lib/api/clients';

export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // CMD+K / CTRL+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Eager-load client list when bar opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listClients({ limit: 100 })
      .then((res) => {
        setClients(res.items);
        setFiltered(res.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Filter on query change
  useEffect(() => {
    const q = query.toLowerCase().trim();
    setFiltered(
      q ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.occupation?.toLowerCase().includes(q)) : clients,
    );
    setActiveIdx(0);
  }, [query, clients]);

  const navigate = useCallback(
    (client: Client) => {
      router.push(`/dashboard/clients/${client.id}`);
      setOpen(false);
      setQuery('');
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[activeIdx]) navigate(filtered[activeIdx]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients by name or occupation…"
            aria-label="Search clients"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul className="max-h-72 overflow-y-auto py-2" role="listbox">
          {loading && (
            <li className="px-4 py-3 text-sm text-slate-400">Loading clients…</li>
          )}
          {!loading && filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">No clients found.</li>
          )}
          {!loading && filtered.map((client, i) => (
            <li
              key={client.id}
              role="option"
              aria-selected={i === activeIdx}
              onClick={() => navigate(client)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                i === activeIdx ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <User className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{client.name}</p>
                <p className="text-xs text-slate-500">{client.occupation || '—'}</p>
              </div>
              {client.calculatedHealthScore != null && (
                <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-mono font-semibold text-indigo-700">
                  {client.calculatedHealthScore.toFixed(1)}
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-3 text-[11px] text-slate-400">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
