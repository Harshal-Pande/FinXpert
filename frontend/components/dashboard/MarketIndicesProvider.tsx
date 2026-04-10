'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchMarketIndices, type MarketPulse } from '@/lib/api/market';
import { ApiError } from '@/lib/api/client';

/** 30–60s refresh window (ms). */
const REFRESH_MS = 50_000;

type Ctx = {
  indices: MarketPulse[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MarketIndicesContext = createContext<Ctx | null>(null);

export function MarketIndicesProvider({ children }: { children: ReactNode }) {
  const [indices, setIndices] = useState<MarketPulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchMarketIndices();
      setIndices([...data]);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : 'Market data is temporarily unavailable.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(
    () => ({ indices, loading, error, refresh }),
    [indices, loading, error, refresh],
  );

  return (
    <MarketIndicesContext.Provider value={value}>{children}</MarketIndicesContext.Provider>
  );
}

export function useMarketIndices(): Ctx {
  const ctx = useContext(MarketIndicesContext);
  if (!ctx) {
    throw new Error('useMarketIndices must be used within MarketIndicesProvider');
  }
  return ctx;
}
