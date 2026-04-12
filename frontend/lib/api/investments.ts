import { apiClient } from './client';
import type { Investment } from './clients';

export type SimpleInvestmentCategory = 'STOCK' | 'DEBT' | 'CRYPTO' | 'MUTUAL_FUND';

export interface CreateInvestmentPayload {
  instrument_name: string;
  category: SimpleInvestmentCategory;
  /** Unit buy price (INR). */
  price: number;
  quantity: number;
  bought_at?: string;
}

export function createInvestment(clientId: string, payload: CreateInvestmentPayload) {
  return apiClient<Investment>(`/clients/${clientId}/investments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
