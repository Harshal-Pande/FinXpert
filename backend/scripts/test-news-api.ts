/**
 * Test NewsAPI.org calls used for market news (same as MarketDataService.fetchFinancialNews).
 *
 * Run from backend root: npx tsx scripts/test-news-api.ts
 *
 * Loads variables by parsing .env files with dotenv.parse() — does not rely on
 * process.env injection (tsx/dotenv may skip keys already defined in the shell).
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/** Prefer backend/ when cwd is repo root. */
function resolveEnvRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '.env'))) return cwd;
  const nested = path.join(cwd, 'backend');
  if (fs.existsSync(path.join(nested, '.env'))) return nested;
  return cwd;
}

function loadEnvFromFiles(): Record<string, string> {
  const root = resolveEnvRoot();
  const merged: Record<string, string> = {};

  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    try {
      const src = fs.readFileSync(p, 'utf8');
      const parsed = dotenv.parse(src);
      for (const [k, v] of Object.entries(parsed)) {
        if (v !== undefined && v !== null) merged[k] = v;
      }
    } catch {
      // ignore unreadable file
    }
  }

  return merged;
}

const env = loadEnvFromFiles();

const DEFAULT_QUERY = 'Indian stock market';

function maskKey(key: string): string {
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function looksLikeApiKey(value: string): boolean {
  return /^[a-f0-9]{24,}$/i.test(value.trim());
}

function resolveQuery(): string {
  const q =
    env.NEWS_MARKET_QUERY?.trim() || process.env.NEWS_MARKET_QUERY?.trim();
  if (!q || looksLikeApiKey(q)) {
    if (q && looksLikeApiKey(q)) {
      console.warn(
        '\n⚠️  NEWS_MARKET_QUERY looks like an API key, not a search phrase.\n' +
          '   Move that value to NEWS_API_KEY_2 and set NEWS_MARKET_QUERY=Indian stock market.\n' +
          '   Using default query for HTTP tests.\n',
      );
    }
    return DEFAULT_QUERY;
  }
  return q;
}

type KeyEntry = { envLabel: string; key: string };

function collectKeys(): KeyEntry[] {
  const raw: KeyEntry[] = [];

  // File (dotenv.parse) first; then shell/process.env (tsx may preload empty vars).
  const k1 =
    env.NEWS_API_KEY?.trim() || process.env.NEWS_API_KEY?.trim();
  if (k1) raw.push({ envLabel: 'NEWS_API_KEY', key: k1 });

  const k2 =
    env.NEWS_API_KEY_2?.trim() ||
    env.NEWS_API_KEY_SECONDARY?.trim() ||
    process.env.NEWS_API_KEY_2?.trim() ||
    process.env.NEWS_API_KEY_SECONDARY?.trim();
  if (k2) raw.push({ envLabel: 'NEWS_API_KEY_2 (or NEWS_API_KEY_SECONDARY)', key: k2 });

  const seen = new Set<string>();
  return raw.filter((e) => {
    if (seen.has(e.key)) return false;
    seen.add(e.key);
    return true;
  });
}

interface NewsApiErrorBody {
  status: string;
  code?: string;
  message?: string;
}

interface NewsApiOkBody {
  status: string;
  totalResults?: number;
  articles?: Array<{
    title?: string;
    description?: string;
    url?: string;
    urlToImage?: string | null;
    source?: { name?: string };
    publishedAt?: string;
  }>;
}

async function callNewsEverything(apiKey: string, query: string, pageSize: number) {
  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', query);
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('apiKey', apiKey);

  const res = await fetch(url);
  const body = (await res.json()) as NewsApiErrorBody | NewsApiOkBody;

  return { httpStatus: res.status, body };
}

async function run() {
  console.log('FinXpert — NewsAPI market news smoke test\n');
  const envRoot = resolveEnvRoot();
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Env files from: ${envRoot}\n`);

  const entries = collectKeys();
  const query = resolveQuery();

  if (entries.length === 0) {
    const envPath = path.join(envRoot, '.env');
    const exists = fs.existsSync(envPath);
    console.error('No NEWS_API_KEY available.\n');
    console.error(
      '  1) Save backend/.env with a line like NEWS_API_KEY=your_key (not commented).\n' +
        '  2) Or run: NEWS_API_KEY=your_key npm run test:news\n' +
        '  (dotenv.config() alone can skip keys already set empty in the shell; this script reads the file with dotenv.parse().)\n',
    );
    console.error(`  Looking for: ${envPath} ${exists ? '(exists)' : '(missing)'}\n`);
    process.exit(1);
  }

  console.log(
    `(Parsed ${Object.keys(env).length} keys from .env / .env.local under ${envRoot})\n`,
  );

  for (const { envLabel, key } of entries) {
    console.log('\n' + '='.repeat(60));
    console.log(`Source: ${envLabel}`);
    console.log(`Masked key: ${maskKey(key)}`);
    console.log(`Query: ${query}`);

    try {
      const { httpStatus, body } = await callNewsEverything(key, query, 5);
      console.log(`HTTP status: ${httpStatus}`);

      if (body.status === 'error') {
        const err = body as NewsApiErrorBody;
        console.log(`NewsAPI: error`);
        console.log(`  code: ${err.code ?? '(none)'}`);
        console.log(`  message: ${err.message ?? '(none)'}`);
        continue;
      }

      const ok = body as NewsApiOkBody;
      console.log(`NewsAPI: ${ok.status}`);
      console.log(`  totalResults (approx.): ${ok.totalResults ?? 'n/a'}`);

      const articles = ok.articles ?? [];
      if (articles.length === 0) {
        console.log('  (no articles in this page)');
        continue;
      }

      console.log('  Sample articles:');
      articles.slice(0, 5).forEach((a, i) => {
        const title = a.title ?? '(no title)';
        const src = a.source?.name ?? '?';
        const t = a.publishedAt ?? '?';
        const thumb = a.urlToImage ? 'yes' : 'no';
        console.log(`    ${i + 1}. ${title.slice(0, 90)}${title.length > 90 ? '…' : ''}`);
        console.log(`       source: ${src} | time: ${t} | thumbnail: ${thumb}`);
      });
    } catch (e) {
      console.log(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    '\n' +
      'Done. Use a real search phrase for NEWS_MARKET_QUERY in production.\n',
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
