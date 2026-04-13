'use client';

import { useCallback, useRef, useState } from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { bulkCreateInvestments } from '@/lib/api/investments';
import {
  parseWorkbookArrayBuffer,
  downloadPortfolioTemplate,
  type ParsedBulkRow,
} from '@/lib/portfolio-import';

type Props = {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onImported: () => void | Promise<void>;
};

export default function ImportPortfolioModal({ open, onClose, clientId, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedBulkRow[]>([]);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setParsed([]);
    setFileLabel(null);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const onPickFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setFileLabel(file.name);
    try {
      const buf = await file.arrayBuffer();
      const rows = parseWorkbookArrayBuffer(buf);
      if (rows.length === 0) {
        setParsed([]);
        setParseError(
          'No valid rows found. Use columns: Name (or Instrument Name), Category (STOCK, DEBT, CRYPTO, MUTUAL_FUND), Quantity, PricePerUnit.',
        );
        return;
      }
      setParsed(rows);
    } catch {
      setParsed([]);
      setParseError('Could not read this file. Try .xlsx, .xls, or .csv.');
    }
  }, []);

  const handleConfirm = async () => {
    if (parsed.length === 0) return;
    setSubmitting(true);
    try {
      const res = await bulkCreateInvestments(clientId, parsed);
      toast.success('Portfolio imported', {
        description: `${res.imported} holding(s) added. Client AUM updated.`,
      });
      await onImported();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !clientId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border-2 border-slate-800 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Import from Excel</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 overflow-y-auto flex-1">
          <p className="text-sm text-slate-600">
            Upload an <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file. We map{' '}
            <strong>Name</strong>, <strong>Category</strong>, <strong>Quantity</strong>, and{' '}
            <strong>PricePerUnit</strong> (or Buy Price). CMP is verified per row on the server.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-800 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Choose file
            </button>
            <button
              type="button"
              onClick={() => {
                downloadPortfolioTemplate();
                toast.message('Template downloaded', { description: 'portfolio_template.xlsx' });
              }}
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              Download portfolio_template.xlsx
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={onPickFile}
            />
            {fileLabel ? <span className="text-xs text-slate-500 truncate max-w-[200px]">{fileLabel}</span> : null}
          </div>

          {parseError ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {parseError}
            </p>
          ) : null}

          {parsed.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Review ({parsed.length} row{parsed.length !== 1 ? 's' : ''}) — confirm to import
              </p>
              <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-[min(360px,45vh)] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Name</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Category</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Qty</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Buy ₹/unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsed.map((r, i) => (
                      <tr key={`${r.instrument_name}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-slate-800">{r.instrument_name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.category}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(r.buyPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 bg-slate-50/80">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsed.length === 0 || submitting}
            onClick={() => void handleConfirm()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Importing…' : `Confirm import${parsed.length ? ` (${parsed.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
