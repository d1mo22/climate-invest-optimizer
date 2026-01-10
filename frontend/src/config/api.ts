export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
export const IS_DEBUG = import.meta.env.VITE_DEBUG === 'true';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  
  // Shops
  SHOPS: '/shops',
  SHOP_BY_ID: (id: number) => `/shops/${id}`,
  SHOP_MEASURES: (id: number) => `/shops/${id}/measures`,
  SHOP_APPLICABLE_MEASURES: (id: number) => `/shops/${id}/applicable-measures`,
  SHOP_RISK_ASSESSMENT: (id: number) => `/shops/${id}/risk-assessment`,
  SHOP_RISK_COVERAGE: (id: number) => `/shops/${id}/risk-coverage`,
  
  // Clusters
  CLUSTERS: '/clusters',
  CLUSTER_BY_ID: (id: number) => `/clusters/${id}`,
  CLUSTER_SHOPS: (id: number) => `/clusters/${id}/shops`,
  CLUSTER_RISKS: (id: number) => `/clusters/${id}/risks`,
  
  // Measures
  MEASURES: '/measures',
  MEASURE_BY_NAME: (name: string) => `/measures/${name}`,
  
  // Risks
  RISKS: '/risks',
  RISK_BY_ID: (id: number) => `/risks/${id}`,
  RISK_MEASURES: (id: number) => `/risks/${id}/measures`,
  
  // Optimization
  OPTIMIZE_BUDGET: '/optimization/budget',
  
  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',
};
