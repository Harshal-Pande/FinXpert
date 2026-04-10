import Link from 'next/link';

/**
 * Browsing /api on port 3020 used to hit Next rewrites → Nest. If Nest is down, that looks like
 * "connection refused". This page only handles GET /api (exact); /api/* still rewrites to Nest.
 */
export default function ApiDevHintPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-16 text-slate-800">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">FinXpert · local dev</p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">You opened the wrong URL</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Port <strong>3020</strong> is the Next.js app. JSON routes live on the{' '}
          <strong>Nest</strong> server on port <strong>3001</strong>.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          <li>
            <span className="font-semibold text-slate-800">Web app: </span>
            <Link className="text-blue-600 underline" href="/dashboard">
              /dashboard
            </Link>{' '}
            <span className="text-slate-500">(start frontend: cd frontend && npm run dev)</span>
          </li>
          <li>
            <span className="font-semibold text-slate-800">API base: </span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">http://127.0.0.1:3001/api</code>
          </li>
          <li>
            <span className="font-semibold text-slate-800">Health: </span>
            <a
              className="text-blue-600 underline"
              href="http://127.0.0.1:3001/health"
              target="_blank"
              rel="noreferrer"
            >
              http://127.0.0.1:3001/health
            </a>
          </li>
        </ul>
        <p className="mt-8 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          If links to :3001 fail with connection refused, start the API first:{' '}
          <code className="whitespace-pre-wrap break-all rounded bg-amber-100/80 px-1">
            cd backend && npm run start:dev
          </code>
        </p>
        <p className="mt-4 text-xs text-slate-500">
          From repo root you can run both: <code className="rounded bg-slate-100 px-1">npm run simulate</code>
        </p>
      </div>
    </div>
  );
}
