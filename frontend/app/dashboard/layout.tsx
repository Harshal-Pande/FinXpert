'use client';

import { Toaster } from 'sonner';
import CommandBar from '@/components/layout/CommandBar';
import TopNav from '@/components/layout/TopNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav
        onCmdK={() => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
          );
        }}
      />

      <main>{children}</main>

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
