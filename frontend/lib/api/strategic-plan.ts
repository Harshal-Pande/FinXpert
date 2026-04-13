import { apiClient } from './client';

export type StrategicPlanSource = 'gemini' | 'fallback';

export interface StrategicPlanDerived {
  total_aum: number;
  monthly_income: number;
  monthly_expense: number;
  health_score: number;
  allocation: {
    STOCK: number;
    DEBT: number;
    CRYPTO: number;
    MUTUAL_FUND: number;
  };
  stress_test_loss_inr: number;
}

export interface StrategicPlanResponse {
  clientId: string;
  plan: string;
  source: StrategicPlanSource;
  derived: StrategicPlanDerived;
}

export function postClientStrategicPlan(clientId: string): Promise<StrategicPlanResponse> {
  return apiClient<StrategicPlanResponse>(`/clients/${clientId}/advisory/strategy`, {
    method: 'POST',
  });
}
