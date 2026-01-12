import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface DashboardStats {
  total_shops: number;
  total_clusters: number;
  average_risk: number;
  high_risk_shops: number;
  total_measures: number;
  applied_measures: number;
  total_investment: number;
  coverage_percentage: number;
}

export const dashboardService = {
  // Get dashboard stats (matches backend /dashboard/stats)
  getStats: async (): Promise<DashboardStats> => {
    return apiClient.get(API_ENDPOINTS.DASHBOARD_STATS);
  },
};
