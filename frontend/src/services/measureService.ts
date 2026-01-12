import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

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

export const measureService = {
  // Get all measures
  getMeasures: async (params?: {
    type?: 'natural' | 'material' | 'inmaterial';
  }): Promise<Measure[]> => {
    const measures = await apiClient.get<RawMeasure[]>(API_ENDPOINTS.MEASURES, { params });
    return Array.isArray(measures) ? measures.map(mapMeasure) : [];
  },

  // Get measure by name
  getMeasureByName: async (name: string): Promise<Measure> => {
    const measure = await apiClient.get<RawMeasure>(API_ENDPOINTS.MEASURE_BY_NAME(name));
    return mapMeasure(measure);
  },
};
