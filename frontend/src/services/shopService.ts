import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface Shop {
  id: number;
  location: string;
  utm_north: number;
  utm_east: number;
  totalRisk?: number;
  taxonomyCoverage?: number;
  surface?: number;
  carbonFootprint?: number;
  cluster_id: number;
  country?: string;
}

export interface ShopWithCluster extends Shop {
  cluster?: {
    id: number;
    name: string;
    utm_north: number;
    utm_east: number;
  };
  country?: string;
}

export interface ShopMeasure {
  shop_id: number;
  measure_name: string;
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

export interface RiskAssessment {
  shop_id: number;
  overall_risk_score?: number;
  risk_level?: string;
  risks: Array<{
    id: number;
    name: string;
    exposure: string;
    sensitivity: string;
    consequence: string;
    probability: string;
    risk_score?: number;
  }>;
  last_updated?: string;
}

export interface RiskCoverageItem {
  risk_id: number;
  risk_name: string;
  risk_score?: number;
  is_covered: boolean;
  covering_measures?: Measure[];
  available_measures?: Measure[];
}

export interface RiskCoverageResponse {
  shop_id: number;
  shop_location?: string;
  shop_country?: string;
  total_risks: number;
  covered_risks: number;
  uncovered_risks: number;
  coverage_percentage: number;
  risks: RiskCoverageItem[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

type RawShopResponse = {
  id: number;
  location: string;
  utm_north: number;
  utm_east: number;
  total_risk?: number;
  totalRisk?: number;
  taxonomy_coverage?: number;
  taxonomyCoverage?: number;
  surface?: number;
  carbon_footprint?: number;
  carbonFootprint?: number;
  cluster_id: number;
  cluster_name?: string;
  country?: string;
};

const mapShop = (shop: RawShopResponse): ShopWithCluster => ({
  id: shop.id,
  location: shop.location,
  utm_north: shop.utm_north,
  utm_east: shop.utm_east,
  totalRisk: shop.total_risk ?? shop.totalRisk,
  taxonomyCoverage: shop.taxonomy_coverage ?? shop.taxonomyCoverage,
  surface: shop.surface,
  carbonFootprint: shop.carbon_footprint ?? shop.carbonFootprint,
  cluster_id: shop.cluster_id,
  country: shop.country,
  cluster: shop.cluster_name
    ? {
        id: shop.cluster_id,
        name: shop.cluster_name,
        utm_north: shop.utm_north,
        utm_east: shop.utm_east,
      }
    : undefined,
});

export const shopService = {
  // Get all shops with pagination
  getShops: async (params?: {
    page?: number;
    page_size?: number;
    country?: string;
    cluster_id?: number;
  }): Promise<PaginatedResponse<ShopWithCluster>> => {
    const response = await apiClient.get<PaginatedResponse<RawShopResponse>>(API_ENDPOINTS.SHOPS, { params });
    return {
      items: response.items.map(mapShop),
      pagination: response.pagination,
    };
  },

  // Get shop by ID
  getShopById: async (id: number): Promise<ShopWithCluster> => {
    const shop = await apiClient.get<RawShopResponse>(API_ENDPOINTS.SHOP_BY_ID(id));
    return mapShop(shop);
  },

  // Create new shop
  createShop: async (shop: Omit<Shop, 'id'>): Promise<Shop> => {
    return apiClient.post(API_ENDPOINTS.SHOPS, shop);
  },

  // Update shop
  updateShop: async (id: number, shop: Partial<Shop>): Promise<Shop> => {
    return apiClient.patch(API_ENDPOINTS.SHOP_BY_ID(id), shop);
  },

  // Delete shop
  deleteShop: async (id: number): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.SHOP_BY_ID(id));
  },

  // Get shop measures
  getShopMeasures: async (id: number): Promise<Measure[]> => {
    const measures = await apiClient.get<RawMeasure[]>(API_ENDPOINTS.SHOP_MEASURES(id));
    return Array.isArray(measures) ? measures.map(mapMeasure) : [];
  },

  // Apply measure to shop
  applyMeasure: async (shopId: number, measureName: string): Promise<void> => {
    return apiClient.post(API_ENDPOINTS.SHOP_MEASURES(shopId), {
      measure_names: [measureName],
    });
  },

  // Remove measure from shop
  removeMeasure: async (shopId: number, measureName: string): Promise<void> => {
    return apiClient.delete(`${API_ENDPOINTS.SHOP_MEASURES(shopId)}/${measureName}`);
  },

  // Get applicable measures for shop
  getApplicableMeasures: async (id: number): Promise<Measure[]> => {
    const measures = await apiClient.get<RawMeasure[]>(API_ENDPOINTS.SHOP_APPLICABLE_MEASURES(id));
    return Array.isArray(measures) ? measures.map(mapMeasure) : [];
  },

  // Get risk assessment for shop
  getRiskAssessment: async (id: number): Promise<RiskAssessment> => {
    return apiClient.get(API_ENDPOINTS.SHOP_RISK_ASSESSMENT(id));
  },

  // Get risk coverage for shop (covered/uncovered + measures)
  getRiskCoverage: async (id: number): Promise<RiskCoverageResponse> => {
    const coverage = await apiClient.get<any>(API_ENDPOINTS.SHOP_RISK_COVERAGE(id));

    // Normalize nested measures arrays (estimated_cost -> estimatedCost)
    const risks: RiskCoverageItem[] = Array.isArray(coverage?.risks)
      ? coverage.risks.map((r: any) => ({
          risk_id: r.risk_id,
          risk_name: r.risk_name,
          risk_score: r.risk_score,
          is_covered: !!r.is_covered,
          covering_measures: Array.isArray(r.covering_measures)
            ? r.covering_measures.map(mapMeasure)
            : [],
          available_measures: Array.isArray(r.available_measures)
            ? r.available_measures.map(mapMeasure)
            : [],
        }))
      : [];

    return {
      shop_id: coverage?.shop_id ?? id,
      shop_location: coverage?.shop_location,
      shop_country: coverage?.shop_country,
      total_risks: coverage?.total_risks ?? 0,
      covered_risks: coverage?.covered_risks ?? 0,
      uncovered_risks: coverage?.uncovered_risks ?? 0,
      coverage_percentage: coverage?.coverage_percentage ?? 0,
      risks,
    };
  },
};
