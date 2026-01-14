import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface OptimizationRequest {
  shop_ids: number[];
  max_budget: number;
  strategy?: 'greedy' | 'knapsack' | 'weighted';
  risk_priorities?: number[];
}

export type OptimizationResult = {
  total_cost: number;
  remaining_budget: number;
  total_risk_reduction: number;
  strategy_used: string;
  metrics?: {
    budget_utilization_percentage: number;
    average_risk_reduction: number;
    estimated_roi: number;
    processing_time_ms: number;
  };
  shop_recommendations: Array<{
    shop_id: number;
    shop_location: string;
    current_risk: number;
    projected_risk: number;
    estimated_investment: number;
    measures: Array<{
      measure: {
        name: string;
        estimatedCost?: number;
        estimated_cost?: number;
        type: string;
      };
      priority: number;
      risk_reduction_percentage: number;
      cost_efficiency_score: number;
      affected_risks: string[];
      justification: string;
    }>;
  }>;
};

export const optimizationService = {
  // Optimize budget allocation
  optimizeBudget: async (
    request: OptimizationRequest
  ): Promise<OptimizationResult> => {
    console.log("optimizationService.optimizeBudget called with:", request);
    try {
      const result = await apiClient.post<OptimizationResult>(API_ENDPOINTS.OPTIMIZE_BUDGET, request);
      console.log("optimizationService.optimizeBudget result:", result);
      return result;
    } catch (error) {
      console.error("optimizationService.optimizeBudget error:", error);
      throw error;
    }
  },
};
