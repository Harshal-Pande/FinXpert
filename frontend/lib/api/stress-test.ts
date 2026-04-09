import { apiClient } from './client';

export type StressScenario = 'MARKET_MELTDOWN' | 'JOB_LOSS' | 'MEDICAL_SHOCK';

export interface StressTestResult {
  scenario: StressScenario;
  currentScore: number;
  stressedScore: number;
  pointsDropped: number;
  survivalHorizonMonths: number;
  biggestVulnerability: string;
}

export function runStressTest(clientId: string, scenario: StressScenario) {
  return apiClient<StressTestResult>(`/clients/${clientId}/stress-test`, {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  });
}
