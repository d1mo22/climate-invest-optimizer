import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';
import type { Shop } from './shopService';

export interface Cluster {
  id: number;
  name: string;
  utm_north: number;
  utm_east: number;
}

export interface ClusterWithRisks extends Cluster {
  risks?: ClusterRisk[];
}

export interface ClusterRisk {
  id: number;
  name: string;
  exposure: string;
  sensitivity: string;
  consequence: string;
  probability: string;
  risk_score?: number;
  cluster_id?: number;
}

const mapClusterRisk = (r: any): ClusterRisk => ({
  id: r.id ?? r.risk_id,
  name: r.name ?? r.risk_name ?? "",
  exposure: r.exposure,
  sensitivity: r.sensitivity,
  consequence: r.consequence,
  probability: r.probability,
  risk_score: r.risk_score,
  cluster_id: r.cluster_id,
});

export const clusterService = {
  // Get all clusters
  getClusters: async (): Promise<Cluster[]> => {
    return apiClient.get(API_ENDPOINTS.CLUSTERS);
  },

  // Get cluster by ID with risks
  getClusterById: async (id: number): Promise<ClusterWithRisks> => {
    const cluster = await apiClient.get<ClusterWithRisks>(API_ENDPOINTS.CLUSTER_BY_ID(id));
    return {
      ...cluster,
      risks: cluster.risks?.map(mapClusterRisk),
    };
  },

  // Get shops in cluster
  getClusterShops: async (id: number): Promise<Shop[]> => {
    return apiClient.get(API_ENDPOINTS.CLUSTER_SHOPS(id));
  },

  // Get cluster risks
  getClusterRisks: async (id: number): Promise<ClusterRisk[]> => {
    const risks = await apiClient.get<any[]>(API_ENDPOINTS.CLUSTER_RISKS(id));
    return risks.map(mapClusterRisk);
  },
};
