/**
 * Central API exports. Set `NEXT_PUBLIC_API_URL` to your Nest base including `/api`.
 */
export { apiClient, ApiError, getBackendOrigin } from './client';
export { login, type LoginPayload, type LoginResponse } from './auth';
export {
  listClients,
  getClient,
  createClient,
  type Client,
  type ListClientsResponse,
  type CreateClientPayload,
} from './clients';
export { createInvestment, type CreateInvestmentPayload, type SimpleInvestmentCategory } from './investments';
export { getUpcomingCompliance, type ComplianceItem } from './compliance';
export {
  getMarketNewsFeed,
  toMarketEvent,
  type MarketNewsItemDto,
  type MarketNewsFeedResponse,
  type MarketNewsFeedSource,
  type NewsFeedScope,
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
