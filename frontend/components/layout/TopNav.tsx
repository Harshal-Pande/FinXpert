'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/clients', icon: Users, label: 'Clients' },
  { href: '/dashboard/health-score-builder', icon: FlaskConical, label: 'Health Builder' },
  { href: '/dashboard/trends', icon: TrendingUp, label: 'Market Trends' },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

export default function TopNav({
  onCmdK,
}: {
  onCmdK: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeHref = useMemo(() => {
    const hit = NAV_ITEMS.find((i) => isActive(pathname, i.href));
    return hit?.href ?? '/dashboard';
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-50"
            aria-label="FinXpert"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold tracking-tight text-white">
              FX
            </div>
            <span className="hidden sm:inline text-sm font-bold text-slate-800">FinXpert</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = activeHref === href;
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCmdK}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-400 hover:bg-white transition-all"
            aria-label="Search clients (Cmd+K)"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            Search clients…
            <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = activeHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                    active ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCmdK();
              }}
              className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-white"
            >
              <span>Search clients</span>
              <span className="text-xs font-mono text-slate-400">⌘K</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

