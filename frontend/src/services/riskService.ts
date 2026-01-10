import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface Risk {
  id: number;
  name: string;
  svg?: string;
}

export interface Measure {
  name: string;
  estimatedCost: number;
  type: 'natural' | 'material' | 'inmaterial';
}

type RawMeasure = {
  name: string;
  estimatedCost?: number;
  estimated_cost?: number;
  type: 'natural' | 'material' | 'inmaterial';
};

const mapMeasure = (m: RawMeasure): Measure => ({
  name: m.name,
  estimatedCost: m.estimatedCost ?? m.estimated_cost ?? 0,
  type: m.type,
});

export interface RiskWithMeasures extends Risk {
  measures?: Measure[];
}

export const riskService = {
  // Get all risks
  getRisks: async (): Promise<Risk[]> => {
    return apiClient.get(API_ENDPOINTS.RISKS);
  },

  // Get risk by ID
  getRiskById: async (id: number): Promise<Risk> => {
    return apiClient.get(API_ENDPOINTS.RISK_BY_ID(id));
  },

  // Get measures for a risk
  getRiskMeasures: async (id: number): Promise<Measure[]> => {
    const measures = await apiClient.get<RawMeasure[]>(API_ENDPOINTS.RISK_MEASURES(id));
    return Array.isArray(measures) ? measures.map(mapMeasure) : [];
  },
};
