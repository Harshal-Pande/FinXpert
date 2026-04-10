'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FlaskConical, TrendingUp, Settings, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',                    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/clients',            icon: Users,           label: 'Clients' },
  { href: '/dashboard/health-score-builder', icon: FlaskConical,  label: 'Health Builder' },
  { href: '/dashboard/trends',            icon: TrendingUp,      label: 'Market Trends' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center border-r border-slate-200 bg-white py-5 shadow-sm transition-all duration-200 hover:w-56 group overflow-hidden">

      {/* Logo mark */}
      <div className="mb-6 flex items-center gap-3 px-3 w-full">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold tracking-tight">
          FX
        </div>
        <span className="hidden group-hover:block text-sm font-bold text-slate-800 whitespace-nowrap">
          FinXpert
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-1 w-full px-2 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {/* Active left-border accent pill */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-300" />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden group-hover:block whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — Settings & Logout */}
      <div className="w-full px-2 pt-3 border-t border-slate-100 flex flex-col gap-1">
        <Link
          href="/dashboard/settings"
          aria-label="Settings"
          title="Settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className="hidden group-hover:block whitespace-nowrap">Settings</span>
        </Link>
        <button
          type="button"
          aria-label="Log out"
          title="Log out"
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full text-left"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden group-hover:block whitespace-nowrap">Log out</span>
        </button>
      </div>
    </aside>
  );
}
