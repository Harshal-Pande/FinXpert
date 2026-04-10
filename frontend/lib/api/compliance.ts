import { apiClient } from './client';

export interface ComplianceItem {
  id: string;
  name: string;
  dueDate: string;
  status: 'pending' | 'urgent';
}

export async function getUpcomingCompliance(advisorId?: string): Promise<ComplianceItem[]> {
  const q = advisorId ? `?advisorId=${encodeURIComponent(advisorId)}` : '';
  return apiClient<ComplianceItem[]>(`/compliance/upcoming${q}`);
}
