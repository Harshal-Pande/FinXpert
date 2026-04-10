'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

// Map path segments to human-readable labels
const SEGMENT_LABELS: Record<string, string> = {
  dashboard:             'Dashboard',
  clients:               'Clients',
  'health-score-builder':'Health Builder',
  'market-insights':     'Market Trends',
  trends:                'Market Trends',
};

interface BreadcrumbProps {
  /** Override label for the last segment (e.g. client name) */
  leafLabel?: string;
}

export default function Breadcrumb({ leafLabel }: BreadcrumbProps) {
  const pathname = usePathname();

  // Build crumbs from '/dashboard/clients/abc' → [{href, label}, ...]
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    const label =
      isLast && leafLabel
        ? leafLabel
        : SEGMENT_LABELS[seg] ?? seg; // fallback to raw segment (UUID trimmed below)
    return { href, label, isLast };
  });

  // If the last crumb looks like a UUID, only show it if leafLabel was given
  // Otherwise show nothing for raw UUIDs
  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const filtered = crumbs.filter((c) => {
    const raw = c.href.split('/').pop() ?? '';
    return !(isUuid(raw) && !leafLabel);
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
      <Link href="/dashboard" className="hover:text-slate-800 transition-colors" aria-label="Dashboard home">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {filtered.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-slate-300" />
          {crumb.isLast ? (
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-slate-800 transition-colors truncate max-w-[120px]">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
