// Package handlers contiene los controladores HTTP de la API.
package handlers

import (
	"net/http"
	"strconv"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/application/services"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/gin-gonic/gin"
)

// OptimizationHandler maneja las peticiones de optimización de presupuesto
type OptimizationHandler struct {
	optimizationService services.OptimizationService
}

// NewOptimizationHandler crea una nueva instancia
func NewOptimizationHandler(service services.OptimizationService) *OptimizationHandler {
	return &OptimizationHandler{optimizationService: service}
}

// OptimizeBudget godoc
// @Summary Optimiza la distribución del presupuesto
// @Description Calcula la distribución óptima de medidas preventivas para un presupuesto dado
// @Tags optimization
// @Accept json
// @Produce json
// @Param request body models.OptimizeBudgetRequest true "Parámetros de optimización"
// @Success 200 {object} models.APIResponse[models.OptimizationResult]
// @Failure 400 {object} models.ErrorResponse
// @Failure 422 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /optimization/budget [post]
// @Security BearerAuth
func (h *OptimizationHandler) OptimizeBudget(c *gin.Context) {
	var req models.OptimizeBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return
	}

	result, err := h.optimizationService.OptimizeBudget(c.Request.Context(), &req)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, result, "Optimización completada")
}

// ClusterHandler maneja las peticiones de clusters
type ClusterHandler struct {
	clusterService services.ClusterService
}

// NewClusterHandler crea una nueva instancia
func NewClusterHandler(service services.ClusterService) *ClusterHandler {
	return &ClusterHandler{clusterService: service}
}

// List godoc
// @Summary Lista todos los clusters
// @Description Obtiene la lista de todos los clusters geográficos
// @Tags clusters
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse[[]models.Cluster]
// @Failure 500 {object} models.ErrorResponse
// @Router /clusters [get]
// @Security BearerAuth
func (h *ClusterHandler) List(c *gin.Context) {
	clusters, err := h.clusterService.List(c.Request.Context())
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, clusters, "")
}

// GetByID godoc
// @Summary Obtiene un cluster por ID
// @Description Retorna los detalles de un cluster incluyendo sus riesgos
// @Tags clusters
// @Accept json
// @Produce json
// @Param id path int true "ID del cluster"
// @Success 200 {object} models.APIResponse[models.ClusterWithRisks]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /clusters/{id} [get]
// @Security BearerAuth
func (h *ClusterHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	cluster, err := h.clusterService.GetByID(c.Request.Context(), id)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, cluster, "")
}

// MeasureHandler maneja las peticiones de medidas
type MeasureHandler struct {
	measureService services.MeasureService
}

// NewMeasureHandler crea una nueva instancia
func NewMeasureHandler(service services.MeasureService) *MeasureHandler {
	return &MeasureHandler{measureService: service}
}

// List godoc
// @Summary Lista todas las medidas
// @Description Obtiene la lista de todas las medidas preventivas disponibles
// @Tags measures
// @Accept json
// @Produce json
// @Param type query string false "Filtrar por tipo (natural, material, immaterial)"
// @Success 200 {object} models.APIResponse[[]models.Measure]
// @Failure 500 {object} models.ErrorResponse
// @Router /measures [get]
// @Security BearerAuth
func (h *MeasureHandler) List(c *gin.Context) {
	measureType := c.Query("type")
	
	var measures []models.Measure
	var err error

	if measureType != "" {
		measures, err = h.measureService.GetByType(c.Request.Context(), models.MeasureType(measureType))
	} else {
		measures, err = h.measureService.List(c.Request.Context())
	}

	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, measures, "")
}

// GetByName godoc
// @Summary Obtiene una medida por nombre
// @Description Retorna los detalles de una medida específica
// @Tags measures
// @Accept json
// @Produce json
// @Param name path string true "Nombre de la medida"
// @Success 200 {object} models.APIResponse[models.Measure]
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /measures/{name} [get]
// @Security BearerAuth
func (h *MeasureHandler) GetByName(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		respondWithError(c, models.ErrInvalidInput("Nombre de medida requerido"))
		return
	}

	measure, err := h.measureService.GetByName(c.Request.Context(), name)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, measure, "")
}

// GetApplicableForShop godoc
// @Summary Obtiene medidas aplicables a una tienda
// @Description Retorna medidas que aún no han sido aplicadas a una tienda específica
// @Tags measures
// @Accept json
// @Produce json
// @Param shopId path int true "ID de la tienda"
// @Success 200 {object} models.APIResponse[[]models.Measure]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id}/applicable-measures [get]
// @Security BearerAuth
func (h *MeasureHandler) GetApplicableForShop(c *gin.Context) {
	shopID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	measures, err := h.measureService.GetApplicableForShop(c.Request.Context(), shopID)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, measures, "")
}

// GetByRisk godoc
// @Summary Obtiene medidas que solucionan un riesgo
// @Description Retorna todas las medidas que pueden mitigar un riesgo climático específico
// @Tags risks, measures
// @Accept json
// @Produce json
// @Param id path int true "ID del riesgo"
// @Success 200 {object} models.APIResponse[[]models.Measure]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /risks/{id}/measures [get]
// @Security BearerAuth
func (h *MeasureHandler) GetByRisk(c *gin.Context) {
	riskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	measures, err := h.measureService.GetByRiskID(c.Request.Context(), riskID)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, measures, "")
}

// RiskHandler maneja las peticiones de riesgos
type RiskHandler struct {
	riskService services.RiskService
}

// NewRiskHandler crea una nueva instancia
func NewRiskHandler(service services.RiskService) *RiskHandler {
	return &RiskHandler{riskService: service}
}

// List godoc
// @Summary Lista todos los riesgos
// @Description Obtiene la lista de todos los riesgos climáticos
// @Tags risks
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse[[]models.Risk]
// @Failure 500 {object} models.ErrorResponse
// @Router /risks [get]
// @Security BearerAuth
func (h *RiskHandler) List(c *gin.Context) {
	risks, err := h.riskService.List(c.Request.Context())
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, risks, "")
}

// GetByID godoc
// @Summary Obtiene un riesgo por ID
// @Description Retorna los detalles de un riesgo específico
// @Tags risks
// @Accept json
// @Produce json
// @Param id path int true "ID del riesgo"
// @Success 200 {object} models.APIResponse[models.Risk]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /risks/{id} [get]
// @Security BearerAuth
func (h *RiskHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	risk, err := h.riskService.GetByID(c.Request.Context(), id)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, risk, "")
}

// GetByCluster godoc
// @Summary Obtiene riesgos de un cluster
// @Description Retorna los riesgos asociados a un cluster con detalles de evaluación
// @Tags risks
// @Accept json
// @Produce json
// @Param clusterId path int true "ID del cluster"
// @Success 200 {object} models.APIResponse[[]models.RiskDetail]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /clusters/{clusterId}/risks [get]
// @Security BearerAuth
func (h *RiskHandler) GetByCluster(c *gin.Context) {
	clusterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	risks, err := h.riskService.GetByCluster(c.Request.Context(), clusterID)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, risks, "")
}

// DashboardHandler maneja las estadísticas del dashboard
type DashboardHandler struct {
	dashboardService services.DashboardService
}

// NewDashboardHandler crea una nueva instancia
func NewDashboardHandler(service services.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashboardService: service}
}

// GetStats godoc
// @Summary Obtiene estadísticas del dashboard
// @Description Retorna métricas generales para el dashboard principal
// @Tags dashboard
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse[models.DashboardStats]
// @Failure 500 {object} models.ErrorResponse
// @Router /dashboard/stats [get]
// @Security BearerAuth
func (h *DashboardHandler) GetStats(c *gin.Context) {
	stats, err := h.dashboardService.GetStats(c.Request.Context())
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, stats, "")
}

// HealthHandler maneja las peticiones de salud del sistema
type HealthHandler struct{}

// NewHealthHandler crea una nueva instancia
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Check godoc
// @Summary Health check
// @Description Verifica que la API está funcionando correctamente
// @Tags health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /health [get]
func (h *HealthHandler) Check(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "API is running",
		"version": "1.0.0",
	})
}
