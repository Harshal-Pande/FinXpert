import { apiClient } from './client';

export interface PortfolioSnapshot {
  id: string;
  totalValue: number;
  date: string;
  month: string;
}

export interface AumHistoryPoint {
  month: string;
  totalValue: number;
}

/** Fetch 6-month portfolio history for a single client. */
export function getClientHistory(clientId: string): Promise<PortfolioSnapshot[]> {
  return apiClient<PortfolioSnapshot[]>(`/clients/${clientId}/history`);
}

/** Aggregate all client snapshots into per-month AUM totals. */
export async function getAdvisorAumHistory(): Promise<AumHistoryPoint[]> {
  // Reuse the dashboard summary endpoint — but we need per-snapshot data.
  // We call /clients/aum-history which sums snapshots by month on the backend.
  return apiClient<AumHistoryPoint[]>('/clients/aum-history');
}
