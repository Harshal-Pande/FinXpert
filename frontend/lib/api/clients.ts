import { apiClient } from './client';

export interface Investment {
  id: string;
  investment_type: 'Stock' | 'Crypto' | 'Debt' | 'Mutual_Fund';
  instrument_name: string;
  quantity: number;
  buy_rate: number;
  total_value: number;
  bought_at: string;
}

export interface Client {
  id: string;
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