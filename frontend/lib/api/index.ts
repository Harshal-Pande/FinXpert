/**
 * Central API exports. Set `NEXT_PUBLIC_API_URL` to your Nest base including `/api`.
 */
export { apiClient, ApiError, getBackendOrigin } from './client';
export { login, type LoginPayload, type LoginResponse } from './auth';
export {
  listClients,
  getClient,
  type Client,
  type ListClientsResponse,
} from './clients';
export { getUpcomingCompliance, type ComplianceItem } from './compliance';
export {
  getMarketNewsFeed,
  toMarketEvent,
  type MarketNewsItemDto,
} from './news';
export {
  fetchMarketIndices,
  getMarketNifty,
  getMarketSensex,
  getMarketGold,
  type MarketPulse,
  type MarketEvent,
} from './market';
export {
  getDashboardSummary,
  type DashboardSummary,
  type ActionItem,
  type StrategicInsight,
} from './dashboard';
export { getAdvisorAumHistory, type AumHistoryPoint } from './portfolio-history';
