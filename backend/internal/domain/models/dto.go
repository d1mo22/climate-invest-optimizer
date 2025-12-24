// Package models contiene los DTOs (Data Transfer Objects) para requests y responses.
package models

// ============================================================================
// REQUEST DTOs
// ============================================================================

// CreateShopRequest representa la solicitud para crear una tienda
type CreateShopRequest struct {
	Location        string  `json:"location" binding:"required,min=3,max=255"`
	CoordinateX     float64 `json:"coordinate_x" binding:"required"`
	CoordinateY     float64 `json:"coordinate_y" binding:"required"`
	Surface         float64 `json:"surface" binding:"required,gt=0"`
	CarbonFootprint float64 `json:"carbon_footprint" binding:"gte=0"`
	ClusterID       int64   `json:"cluster_id" binding:"required,gt=0"`
}

// UpdateShopRequest representa la solicitud para actualizar una tienda
type UpdateShopRequest struct {
	Location        *string  `json:"location,omitempty" binding:"omitempty,min=3,max=255"`
	CoordinateX     *float64 `json:"coordinate_x,omitempty"`
	CoordinateY     *float64 `json:"coordinate_y,omitempty"`
	Surface         *float64 `json:"surface,omitempty" binding:"omitempty,gt=0"`
	CarbonFootprint *float64 `json:"carbon_footprint,omitempty" binding:"omitempty,gte=0"`
	ClusterID       *int64   `json:"cluster_id,omitempty" binding:"omitempty,gt=0"`
}

// ApplyMeasuresRequest representa la solicitud para aplicar medidas a una tienda
type ApplyMeasuresRequest struct {
	MeasureNames []string `json:"measure_names" binding:"required,min=1,dive,required"`
}

// OptimizeBudgetRequest representa la solicitud de optimización de presupuesto
type OptimizeBudgetRequest struct {
	ShopIDs    []int64 `json:"shop_ids" binding:"required,min=1,dive,gt=0"`
	MaxBudget  float64 `json:"max_budget" binding:"required,gt=0"`
	Strategy   string  `json:"strategy,omitempty" binding:"omitempty,oneof=greedy knapsack weighted"`
	Priorities []int64 `json:"risk_priorities,omitempty"` // IDs de riesgos prioritarios
}

// LoginRequest representa la solicitud de login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// RegisterRequest representa la solicitud de registro
type RegisterRequest struct {
	Email    string   `json:"email" binding:"required,email"`
	Password string   `json:"password" binding:"required,min=8"`
	Role     UserRole `json:"role,omitempty"`
}

// PaginationRequest representa los parámetros de paginación
type PaginationRequest struct {
	Page     int    `form:"page,default=1" binding:"min=1"`
	PageSize int    `form:"page_size,default=20" binding:"min=1,max=100"`
	SortBy   string `form:"sort_by,omitempty"`
	SortDir  string `form:"sort_dir,default=asc" binding:"oneof=asc desc"`
}

// ShopFilterRequest representa los filtros para búsqueda de tiendas
type ShopFilterRequest struct {
	PaginationRequest
	ClusterID    *int64   `form:"cluster_id,omitempty"`
	MinRisk      *float64 `form:"min_risk,omitempty"`
	MaxRisk      *float64 `form:"max_risk,omitempty"`
	MinSurface   *float64 `form:"min_surface,omitempty"`
	MaxSurface   *float64 `form:"max_surface,omitempty"`
	SearchQuery  string   `form:"q,omitempty"`
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

// APIResponse representa la estructura estándar de respuesta exitosa
type APIResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data"`
	Message string `json:"message,omitempty"`
}

// PaginatedResponse representa una respuesta paginada
type PaginatedResponse[T any] struct {
	Items      []T            `json:"items"`
	Pagination PaginationMeta `json:"pagination"`
}

// PaginationMeta contiene metadatos de paginación
type PaginationMeta struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// ShopResponse representa la respuesta de una tienda
type ShopResponse struct {
	ID               int64   `json:"id"`
	Location         string  `json:"location"`
	CoordinateX      float64 `json:"coordinate_x"`
	CoordinateY      float64 `json:"coordinate_y"`
	TotalRisk        float64 `json:"total_risk"`
	TaxonomyCoverage float64 `json:"taxonomy_coverage"`
	Surface          float64 `json:"surface"`
	CarbonFootprint  float64 `json:"carbon_footprint"`
	ClusterID        int64   `json:"cluster_id"`
	ClusterName      string  `json:"cluster_name,omitempty"`
}

// OptimizationResult representa el resultado de la optimización de presupuesto
type OptimizationResult struct {
	TotalCost            float64                  `json:"total_cost"`
	RemainingBudget      float64                  `json:"remaining_budget"`
	TotalRiskReduction   float64                  `json:"total_risk_reduction"`
	RecommendedMeasures  []RecommendedMeasure     `json:"recommended_measures"`
	ShopRecommendations  []ShopRecommendation     `json:"shop_recommendations"`
	Strategy             string                   `json:"strategy_used"`
	OptimizationMetrics  OptimizationMetrics      `json:"metrics"`
}

// RecommendedMeasure representa una medida recomendada con su justificación
type RecommendedMeasure struct {
	Measure         Measure  `json:"measure"`
	Priority        int      `json:"priority"`
	RiskReduction   float64  `json:"risk_reduction_percentage"`
	CostEfficiency  float64  `json:"cost_efficiency_score"`
	AffectedRisks   []string `json:"affected_risks"`
	Justification   string   `json:"justification"`
}

// ShopRecommendation representa las recomendaciones para una tienda específica
type ShopRecommendation struct {
	ShopID                int64                `json:"shop_id"`
	ShopLocation          string               `json:"shop_location"`
	CurrentRisk           float64              `json:"current_risk"`
	ProjectedRisk         float64              `json:"projected_risk"`
	Measures              []RecommendedMeasure `json:"measures"`
	EstimatedInvestment   float64              `json:"estimated_investment"`
}

// OptimizationMetrics contiene métricas del proceso de optimización
type OptimizationMetrics struct {
	BudgetUtilization    float64 `json:"budget_utilization_percentage"`
	AverageRiskReduction float64 `json:"average_risk_reduction"`
	ROI                  float64 `json:"estimated_roi"`
	ProcessingTimeMs     int64   `json:"processing_time_ms"`
}

// AuthResponse representa la respuesta de autenticación
type AuthResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
	User      struct {
		ID    int64    `json:"id"`
		Email string   `json:"email"`
		Role  UserRole `json:"role"`
	} `json:"user"`
}

// RiskAssessmentResponse representa la evaluación de riesgos de una tienda
type RiskAssessmentResponse struct {
	ShopID           int64        `json:"shop_id"`
	OverallRiskScore float64      `json:"overall_risk_score"`
	RiskLevel        Level        `json:"risk_level"`
	Risks            []RiskDetail `json:"risks"`
	LastUpdated      string       `json:"last_updated"`
}

// DashboardStats representa estadísticas para el dashboard
type DashboardStats struct {
	TotalShops         int64   `json:"total_shops"`
	TotalClusters      int64   `json:"total_clusters"`
	AverageRisk        float64 `json:"average_risk"`
	HighRiskShops      int64   `json:"high_risk_shops"`
	TotalMeasures      int64   `json:"total_measures"`
	AppliedMeasures    int64   `json:"applied_measures"`
	TotalInvestment    float64 `json:"total_investment"`
	CoveragePercentage float64 `json:"coverage_percentage"`
}
