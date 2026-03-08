// frontend/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
      <h1 className="text-5xl font-black text-slate-900 tracking-tight">FinXpert</h1>
      <p className="mt-4 text-lg text-slate-600 max-w-md text-center">
        AI-enabled financial advisory platform for high-net-worth portfolio management.
      </p>
      <div className="mt-10 flex gap-4">
        <Link 
          href="/dashboard" 
          className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}