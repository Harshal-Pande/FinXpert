'use client';

import { Toaster } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import CommandBar from '@/components/layout/CommandBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Persistent sidebar */}
      <Sidebar />

      {/* Main content — offset by sidebar collapsed width (w-16) */}
      <div className="flex-1 pl-16">
        {/* Global header bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur px-6">
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">FinXpert</p>
          {/* CMD+K trigger hint — dispatches keyboard event to open CommandBar */}
          <CmdKButton />
        </header>

        {/* Page content */}
        <main>{children}</main>
      </div>

      {/* Global CMD+K command bar */}
      <CommandBar />

      {/* Toast notifications — positioned top-right */}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: { fontFamily: 'inherit' },
          duration: 3500,
        }}
      />
    </div>
  );
}

/** Isolated client component so the onClick doesn't bubble up to a server context. */
function CmdKButton() {
  return (
    <button
      id="cmd-k-trigger"
      type="button"
      aria-label="Search clients (Ctrl+K)"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
        );
      }}
      className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-400 hover:bg-white transition-all"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      Search clients…
      <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">⌘K</kbd>
    </button>
  );
}
