import { apiClient } from './client';

export interface PortfolioAsset {
  id: string;
  asset_name: string; // Match Prisma schema
  asset_type: string; // Match Prisma schema
  value: number;
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
  portfolio?: {
    id: string;
    total_value: number;
    assets: PortfolioAsset[];
  };
  healthScores?: { score: number; calculated_at: string }[];
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