import { apiClient } from './client';

export type FormulaFactorId =
  | 'alr'
  | 'emergency_fund'
  | 'diversification'
  | 'investment_behavior'
  | 'crypto_concentration'
  | 'insurance_adequacy'
  | 'tax_efficiency'
  | 'age_factor';

export interface HealthScoreFormulaStep {
  factorId: FormulaFactorId;
  multiplier: number;
  operation: 'add' | 'subtract';
}

export interface HealthScoreFormula {
  id: string;
  advisor_id: string;
  steps: HealthScoreFormulaStep[];
}

export function getHealthScoreFormula() {
  return apiClient<HealthScoreFormula>('/health-score-formula');
}

export function updateHealthScoreFormula(steps: HealthScoreFormulaStep[]) {
  return apiClient<HealthScoreFormula>('/health-score-formula', {
    method: 'PUT',
    body: JSON.stringify({ steps }),
  });
}
