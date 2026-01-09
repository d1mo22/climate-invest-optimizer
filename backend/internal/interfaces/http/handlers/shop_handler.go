// Package handlers contiene los controladores HTTP de la API.
package handlers

import (
	"net/http"
	"strconv"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/application/services"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/gin-gonic/gin"
)

// ShopHandler maneja las peticiones HTTP relacionadas con tiendas
type ShopHandler struct {
	shopService services.ShopService
}

// NewShopHandler crea una nueva instancia de ShopHandler
func NewShopHandler(service services.ShopService) *ShopHandler {
	return &ShopHandler{shopService: service}
}

// List godoc
// @Summary Lista todas las tiendas
// @Description Obtiene una lista paginada de tiendas con filtros opcionales
// @Tags shops
// @Accept json
// @Produce json
// @Param page query int false "Número de página" default(1)
// @Param page_size query int false "Tamaño de página" default(20)
// @Param cluster_id query int false "Filtrar por cluster"
// @Param min_risk query number false "Riesgo mínimo"
// @Param max_risk query number false "Riesgo máximo"
// @Param q query string false "Búsqueda por localización"
// @Success 200 {object} models.APIResponse[models.PaginatedResponse[models.ShopResponse]]
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops [get]
// @Security BearerAuth
func (h *ShopHandler) List(c *gin.Context) {
	var filter models.ShopFilterRequest
	if err := c.ShouldBindQuery(&filter); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return
	}

	result, err := h.shopService.List(c.Request.Context(), &filter)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, result, "")
}

// GetByID godoc
// @Summary Obtiene una tienda por ID
// @Description Retorna los detalles completos de una tienda incluyendo riesgos y medidas
// @Tags shops
// @Accept json
// @Produce json
// @Param id path int true "ID de la tienda"
// @Success 200 {object} models.APIResponse[models.ShopWithDetails]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id} [get]
// @Security BearerAuth
func (h *ShopHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	shop, err := h.shopService.GetByID(c.Request.Context(), id)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, shop, "")
}

// Create godoc
// @Summary Crea una nueva tienda
// @Description Crea una tienda con la información proporcionada
// @Tags shops
// @Accept json
// @Produce json
// @Param shop body models.CreateShopRequest true "Datos de la tienda"
// @Success 201 {object} models.APIResponse[models.Shop]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse "Cluster no encontrado"
// @Failure 500 {object} models.ErrorResponse
// @Router /shops [post]
// @Security BearerAuth
func (h *ShopHandler) Create(c *gin.Context) {
	var req models.CreateShopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return
	}

	shop, err := h.shopService.Create(c.Request.Context(), &req)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusCreated, shop, "Tienda creada exitosamente")
}

// Update godoc
// @Summary Actualiza una tienda
// @Description Actualiza parcialmente una tienda existente
// @Tags shops
// @Accept json
// @Produce json
// @Param id path int true "ID de la tienda"
// @Param shop body models.UpdateShopRequest true "Datos a actualizar"
// @Success 200 {object} models.APIResponse[models.Shop]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id} [patch]
// @Security BearerAuth
func (h *ShopHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	var req models.UpdateShopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return
	}

	shop, err := h.shopService.Update(c.Request.Context(), id, &req)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, shop, "Tienda actualizada exitosamente")
}

// Delete godoc
// @Summary Elimina una tienda
// @Description Elimina una tienda y sus medidas asociadas
// @Tags shops
// @Accept json
// @Produce json
// @Param id path int true "ID de la tienda"
// @Success 204 "Sin contenido"
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id} [delete]
// @Security BearerAuth
func (h *ShopHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	if err := h.shopService.Delete(c.Request.Context(), id); err != nil {
		respondWithError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// ApplyMeasures godoc
// @Summary Aplica medidas a una tienda
// @Description Aplica una o más medidas preventivas a una tienda
// @Tags shops
// @Accept json
// @Produce json
// @Param id path int true "ID de la tienda"
// @Param measures body models.ApplyMeasuresRequest true "Medidas a aplicar"
// @Success 200 {object} models.APIResponse[string]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id}/measures [post]
// @Security BearerAuth
func (h *ShopHandler) ApplyMeasures(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	var req models.ApplyMeasuresRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return
	}

	if err := h.shopService.ApplyMeasures(c.Request.Context(), id, req.MeasureNames); err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, "ok", "Medidas aplicadas exitosamente")
}

// RemoveMeasure godoc
// @Summary Elimina una medida de una tienda
// @Description Elimina una medida previamente aplicada a una tienda
// @Tags shops
// @Accept json
// @Produce json
// @Param id path int true "ID de la tienda"
// @Param measureName path string true "Nombre de la medida"
// @Success 204 "Sin contenido"
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id}/measures/{measureName} [delete]
// @Security BearerAuth
func (h *ShopHandler) RemoveMeasure(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	measureName := c.Param("measureName")
	if measureName == "" {
		respondWithError(c, models.ErrInvalidInput("Nombre de medida requerido"))
		return
	}

	if err := h.shopService.RemoveMeasure(c.Request.Context(), id, measureName); err != nil {
		respondWithError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// GetRiskAssessment godoc
// @Summary Obtiene evaluación de riesgos
// @Description Retorna la evaluación de riesgos climáticos de una tienda
// @Tags shops
// @Accept json
// @Produce json
// @Param id path int true "ID de la tienda"
// @Success 200 {object} models.APIResponse[models.RiskAssessmentResponse]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id}/risk-assessment [get]
// @Security BearerAuth
func (h *ShopHandler) GetRiskAssessment(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	assessment, err := h.shopService.GetRiskAssessment(c.Request.Context(), id)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, assessment, "")
}

// GetAppliedMeasures godoc
// @Summary Obtiene medidas aplicadas a una tienda
// @Description Retorna todas las medidas que ya han sido aplicadas a una tienda
// @Tags shops
// @Accept json
// @Produce json
// @Param id path int true "ID de la tienda"
// @Success 200 {object} models.APIResponse[[]models.Measure]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /shops/{id}/measures [get]
// @Security BearerAuth
func (h *ShopHandler) GetAppliedMeasures(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	measures, err := h.shopService.GetAppliedMeasures(c.Request.Context(), id)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, measures, "")
}

// GetByCluster godoc
// @Summary Obtiene tiendas por cluster
// @Description Retorna todas las tiendas de un cluster específico
// @Tags shops
// @Accept json
// @Produce json
// @Param clusterId path int true "ID del cluster"
// @Success 200 {object} models.APIResponse[[]models.Shop]
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /clusters/{clusterId}/shops [get]
// @Security BearerAuth
func (h *ShopHandler) GetByCluster(c *gin.Context) {
	clusterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respondWithError(c, models.ErrInvalidID)
		return
	}

	shops, err := h.shopService.GetByCluster(c.Request.Context(), clusterID)
	if err != nil {
		respondWithError(c, err)
		return
	}

	respondWithSuccess(c, http.StatusOK, shops, "")
}
