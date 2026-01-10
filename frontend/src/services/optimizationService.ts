import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface OptimizationRequest {
  budget: number;
  priorityWeights?: {
    riskReduction?: number;
    roi?: number;
    carbonReduction?: number;
  };
  constraints?: {
    minShopsAffected?: number;
    maxMeasuresCombination?: number;
    preferredTypes?: Array<'natural' | 'material' | 'inmaterial'>;
  };
  shopIds?: number[];
  clusterIds?: number[];
}

export interface OptimizationResult {
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  recommendations: Array<{
    shop_id: number;
    shop_location: string;
    measures: Array<{
      name: string;
      cost: number;
      type: string;
      expectedRiskReduction: number;
      priority: number;
    }>;
    totalCost: number;
    expectedBenefit: number;
    roi: number;
  }>;
  summary: {
    totalShopsAffected: number;
    totalMeasuresApplied: number;
    averageRiskReduction: number;
    totalROI: number;
  };
}

export const optimizationService = {
  // Optimize budget allocation
  optimizeBudget: async (
    request: OptimizationRequest
  ): Promise<OptimizationResult> => {
    return apiClient.post(API_ENDPOINTS.OPTIMIZE_BUDGET, request);
  },
};
