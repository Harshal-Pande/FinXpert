import { apiClient } from './client';
import type { Investment } from './clients';

export type SimpleInvestmentCategory = 'equity' | 'debt' | 'cash' | 'gold';

export interface CreateInvestmentPayload {
  instrument_name: string;
  value: number;
  category: SimpleInvestmentCategory;
  bought_at?: string;
}

export function createInvestment(clientId: string, payload: CreateInvestmentPayload) {
  return apiClient<Investment>(`/clients/${clientId}/investments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
