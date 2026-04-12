import { apiClient } from './client';

export interface Investment {
  id: string;
  investment_type: 'Stock' | 'Crypto' | 'Debt' | 'Mutual_Fund';
  category: 'STOCK' | 'MUTUAL_FUND' | 'CRYPTO' | 'CASH' | 'GOLD';
  instrument_name: string;
  quantity: number;
  buyPrice: number;
  totalCost: number;
  cmp: number;
  buy_rate: number;
  total_value: number;
  bought_at: string;
  performance?: {
    invested_amount: number;
    current_value: number;
    absolute_pnl: number;
    pnl_percentage: number;
  };
}

export interface Client {
  id: string;
  /** Sum of holdings; synced when investments change via API. */
  total_aum?: number;
  name: string;
  age?: number;
  occupation: string;
  risk_profile?: string;
  annual_income?: number;
  monthly_expense?: number;
  emergency_fund?: number | null;
  insurance_coverage?: number | null;
  investment_horizon?: string | null;
  investments?: Investment[];
  healthScore?: number | null;
  healthScores?: { score: number; calculated_at: string }[];
  calculatedHealthScore?: number;
  calculatedHealthBreakdown?: {
    baseScore: number;
    rawScore: number;
    normalizedScore: number;
    factorValues: Record<string, number>;
    appliedSteps: Array<{
      factorId: string;
      operation: 'add' | 'subtract';
      multiplier: number;
    }>;
    weightedTotal: number;
  };
}

export interface ListClientsResponse {
  items: Client[];
  total: number;
}

export interface CreateClientPayload {
  name: string;
  age: number;
  occupation: string;
  annual_income: number;
  monthly_expense: number;
  emergency_fund?: number;
  insurance_coverage?: number;
  risk_profile?: 'conservative' | 'moderate' | 'aggressive' | 'passive';
  investment_horizon?: 'short' | 'medium' | 'long';
}

export function listClients(params?: { limit?: number; search?: string; riskProfile?: string }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.riskProfile) query.set('riskProfile', params.riskProfile);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient<ListClientsResponse>(`/clients${qs}`);
}

// Ensure this matches your NestJS @Get(':id') route
export function getClient(id: string) {
  return apiClient<Client>(`/clients/${id}`);
}

export function createClient(payload: CreateClientPayload) {
  return apiClient<Client>('/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}