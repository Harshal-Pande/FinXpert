import * as XLSX from 'xlsx';
import type { SimpleInvestmentCategory } from '@/lib/api/investments';

export interface ParsedBulkRow {
  instrument_name: string;
  category: SimpleInvestmentCategory;
  quantity: number;
  buyPrice: number;
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Match Excel column headers to values (case/spacing insensitive). */
function findCell(row: Record<string, unknown>, ...candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const c of candidates) {
    const nc = normKey(c);
    for (const [k, v] of entries) {
      if (normKey(k) === nc) return v;
    }
  }
  for (const c of candidates) {
    const nc = normKey(c);
    if (nc.length < 4) continue;
    for (const [k, v] of entries) {
      const nk = normKey(k);
      if (nk.includes(nc)) return v;
    }
  }
  return undefined;
}

export function normalizeCategoryFromExcel(v: unknown): SimpleInvestmentCategory | null {
  const raw = String(v ?? '').trim();
  if (!raw) return null;
  const u = raw.toUpperCase().replace(/\s+/g, '_');
  if (u === 'STOCK' || u === 'EQUITY' || u === 'SHARES') return 'STOCK';
  if (u === 'DEBT' || u === 'BOND' || u === 'FD' || u === 'CASH') return 'DEBT';
  if (u === 'CRYPTO' || u === 'BITCOIN' || u === 'ETH') return 'CRYPTO';
  if (
    u === 'MUTUAL_FUND' ||
    u === 'MUTUALFUND' ||
    u === 'MF' ||
    raw.toLowerCase().includes('mutual')
  ) {
    return 'MUTUAL_FUND';
  }
  return null;
}

/**
 * Parse first sheet of an .xlsx / .xls / .csv workbook into bulk rows.
 * Expected columns (any similar header): Name, Category, Quantity, PricePerUnit (or Buy Price).
 */
export function parseWorkbookArrayBuffer(buf: ArrayBuffer): ParsedBulkRow[] {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const out: ParsedBulkRow[] = [];

  for (const row of rows) {
    const name = String(
      findCell(row, 'Instrument Name', 'Name', 'InstrumentName', 'instrument_name') ?? '',
    ).trim();
    if (!name) continue;

    const cat = normalizeCategoryFromExcel(findCell(row, 'Category'));
    if (!cat) continue;

    const qty = Number(findCell(row, 'Quantity', 'Qty', 'quantity'));
    const price = Number(
      findCell(row, 'PricePerUnit', 'Buy Price', 'BuyPrice', 'Price', 'Avg Buy', 'buyPrice'),
    );

    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    out.push({
      instrument_name: name,
      category: cat,
      quantity: qty,
      buyPrice: price,
    });
  }

  return out;
}

/** Sample portfolio_template.xlsx with headers Name, Category, Quantity, PricePerUnit. */
export function downloadPortfolioTemplate(): void {
  const aoa: (string | number)[][] = [
    ['Name', 'Category', 'Quantity', 'PricePerUnit'],
    ['HDFC Bank Ltd', 'STOCK', 10, 1650.5],
    ['SBI Magnum Gilt Fund', 'MUTUAL_FUND', 500, 52.34],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');
  XLSX.writeFile(wb, 'portfolio_template.xlsx');
}
