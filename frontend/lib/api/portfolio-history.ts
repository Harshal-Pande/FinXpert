import { apiClient } from './client';

export interface PortfolioHistoryPoint {
  id: string;
  totalValue: number;
  date: string;
  /** 15-day checkpoint label for the chart X-axis */
  label: string;
  month: string;
}

/** @deprecated use PortfolioHistoryPoint */
export type PortfolioSnapshot = PortfolioHistoryPoint;

export interface AumHistoryPoint {
  month: string;
  totalValue: number;
}

/** Fetch 6-month portfolio history for a single client. */
export function getClientHistory(clientId: string): Promise<PortfolioHistoryPoint[]> {
  return apiClient<PortfolioHistoryPoint[]>(`/clients/${clientId}/history`);
}

/** Aggregate all client snapshots into per-month AUM totals. */
export async function getAdvisorAumHistory(): Promise<AumHistoryPoint[]> {
  // Reuse the dashboard summary endpoint — but we need per-snapshot data.
  // We call /clients/aum-history which sums snapshots by month on the backend.
  return apiClient<AumHistoryPoint[]>('/clients/aum-history');
}
