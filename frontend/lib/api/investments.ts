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

export interface UpdateInvestmentPayload {
  instrument_name: string;
  category: SimpleInvestmentCategory;
  quantity: number;
  /** Unit buy price (INR). */
  buyPrice: number;
}

export function updateInvestment(
  clientId: string,
  investmentId: string,
  payload: UpdateInvestmentPayload,
): Promise<Investment> {
  return apiClient<Investment>(`/clients/${clientId}/investments/${investmentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      instrument_name: payload.instrument_name,
      category: payload.category,
      quantity: payload.quantity,
      buyPrice: payload.buyPrice,
      buy_rate: payload.buyPrice,
    }),
  });
}

export interface BulkInvestmentRow {
  instrument_name: string;
  category: SimpleInvestmentCategory;
  quantity: number;
  buyPrice: number;
}

export interface BulkCreateInvestmentsResponse {
  imported: number;
  total_aum: number;
  investments: Investment[];
}

export function bulkCreateInvestments(
  clientId: string,
  rows: BulkInvestmentRow[],
): Promise<BulkCreateInvestmentsResponse> {
  return apiClient<BulkCreateInvestmentsResponse>(`/clients/${clientId}/investments/bulk`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}
