import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Subtle gradient backdrop for premium landing feel */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_40%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-200">
          <TrendingUp className="h-4 w-4" />
          FinXpert
        </div>

        <h1 className="max-w-4xl text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
          FinXpert: Advanced Financial Advisory Platform
        </h1>

        <p className="mt-5 max-w-2xl text-sm text-slate-300 sm:text-base md:text-lg">
          Strategic insights, real-time portfolio tracking, and automated risk assessment.
        </p>

        <Link
          href="/dashboard"
          className="mt-10 inline-flex items-center justify-center bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-all"
        >
          Enter Dashboard
        </Link>
      </section>
    </main>
  );
}