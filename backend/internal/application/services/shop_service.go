// Package services contiene la lógica de negocio de la aplicación.
package services

import (
	"context"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/repository"
)

// ShopService define las operaciones de negocio para tiendas
type ShopService interface {
	Create(ctx context.Context, req *models.CreateShopRequest) (*models.Shop, error)
	GetByID(ctx context.Context, id int64) (*models.ShopWithDetails, error)
	Update(ctx context.Context, id int64, req *models.UpdateShopRequest) (*models.Shop, error)
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, filter *models.ShopFilterRequest) (*models.PaginatedResponse[models.ShopResponse], error)
	GetByCluster(ctx context.Context, clusterID int64) ([]models.Shop, error)
	ApplyMeasures(ctx context.Context, shopID int64, measureNames []string) error
	RemoveMeasure(ctx context.Context, shopID int64, measureName string) error
	GetRiskAssessment(ctx context.Context, shopID int64) (*models.RiskAssessmentResponse, error)
}

// shopService implementa ShopService
type shopService struct {
	shopRepo    repository.ShopRepository
	clusterRepo repository.ClusterRepository
	riskRepo    repository.RiskRepository
	measureRepo repository.MeasureRepository
}

// NewShopService crea una nueva instancia de ShopService
func NewShopService(
	shopRepo repository.ShopRepository,
	clusterRepo repository.ClusterRepository,
	riskRepo repository.RiskRepository,
	measureRepo repository.MeasureRepository,
) ShopService {
	return &shopService{
		shopRepo:    shopRepo,
		clusterRepo: clusterRepo,
		riskRepo:    riskRepo,
		measureRepo: measureRepo,
	}
}

// Create crea una nueva tienda
func (s *shopService) Create(ctx context.Context, req *models.CreateShopRequest) (*models.Shop, error) {
	// Verificar que el cluster existe
	cluster, err := s.clusterRepo.GetByID(ctx, req.ClusterID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if cluster == nil {
		return nil, models.ErrClusterNotFound
	}

	// Crear la tienda
	shop := &models.Shop{
		Location:        req.Location,
		CoordinateX:     req.CoordinateX,
		CoordinateY:     req.CoordinateY,
		Surface:         req.Surface,
		CarbonFootprint: req.CarbonFootprint,
		ClusterID:       req.ClusterID,
		TotalRisk:       0, // Se calculará después
		TaxonomyCoverage: 0,
	}

	if err := s.shopRepo.Create(ctx, shop); err != nil {
		return nil, models.ErrDatabase(err)
	}

	// Calcular riesgo inicial basado en el cluster
	if err := s.updateShopRisk(ctx, shop); err != nil {
		// Log del error pero no fallar
		// El riesgo se puede calcular después
	}

	return shop, nil
}

// GetByID obtiene una tienda con detalles
func (s *shopService) GetByID(ctx context.Context, id int64) (*models.ShopWithDetails, error) {
	shop, err := s.shopRepo.GetWithDetails(ctx, id)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if shop == nil {
		return nil, models.ErrShopNotFound
	}

	// Añadir información de riesgos del cluster
	risks, err := s.riskRepo.GetByClusterID(ctx, shop.ClusterID)
	if err == nil {
		shop.Risks = risks
	}

	return shop, nil
}

// Update actualiza una tienda
func (s *shopService) Update(ctx context.Context, id int64, req *models.UpdateShopRequest) (*models.Shop, error) {
	// Obtener tienda existente
	shop, err := s.shopRepo.GetByID(ctx, id)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if shop == nil {
		return nil, models.ErrShopNotFound
	}

	// Aplicar cambios (partial update)
	if req.Location != nil {
		shop.Location = *req.Location
	}
	if req.CoordinateX != nil {
		shop.CoordinateX = *req.CoordinateX
	}
	if req.CoordinateY != nil {
		shop.CoordinateY = *req.CoordinateY
	}
	if req.Surface != nil {
		shop.Surface = *req.Surface
	}
	if req.CarbonFootprint != nil {
		shop.CarbonFootprint = *req.CarbonFootprint
	}
	if req.ClusterID != nil {
		// Verificar que el nuevo cluster existe
		cluster, err := s.clusterRepo.GetByID(ctx, *req.ClusterID)
		if err != nil {
			return nil, models.ErrDatabase(err)
		}
		if cluster == nil {
			return nil, models.ErrClusterNotFound
		}
		shop.ClusterID = *req.ClusterID
	}

	if err := s.shopRepo.Update(ctx, shop); err != nil {
		return nil, models.ErrDatabase(err)
	}

	return shop, nil
}

// Delete elimina una tienda
func (s *shopService) Delete(ctx context.Context, id int64) error {
	// Verificar que existe
	shop, err := s.shopRepo.GetByID(ctx, id)
	if err != nil {
		return models.ErrDatabase(err)
	}
	if shop == nil {
		return models.ErrShopNotFound
	}

	if err := s.shopRepo.Delete(ctx, id); err != nil {
		return models.ErrDatabase(err)
	}

	return nil
}

// List obtiene una lista paginada de tiendas
func (s *shopService) List(ctx context.Context, filter *models.ShopFilterRequest) (*models.PaginatedResponse[models.ShopResponse], error) {
	shops, total, err := s.shopRepo.List(ctx, filter)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}

	// Convertir a respuesta
	items := make([]models.ShopResponse, len(shops))
	for i, shop := range shops {
		items[i] = models.ShopResponse{
			ID:               shop.ID,
			Location:         shop.Location,
			CoordinateX:      shop.CoordinateX,
			CoordinateY:      shop.CoordinateY,
			TotalRisk:        shop.TotalRisk,
			TaxonomyCoverage: shop.TaxonomyCoverage,
			Surface:          shop.Surface,
			CarbonFootprint:  shop.CarbonFootprint,
			ClusterID:        shop.ClusterID,
		}
	}

	page := 1
	pageSize := 20
	if filter != nil {
		if filter.Page > 0 {
			page = filter.Page
		}
		if filter.PageSize > 0 {
			pageSize = filter.PageSize
		}
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return &models.PaginatedResponse[models.ShopResponse]{
		Items: items,
		Pagination: models.PaginationMeta{
			Page:       page,
			PageSize:   pageSize,
			TotalItems: total,
			TotalPages: totalPages,
			HasNext:    page < totalPages,
			HasPrev:    page > 1,
		},
	}, nil
}

// GetByCluster obtiene tiendas de un cluster
func (s *shopService) GetByCluster(ctx context.Context, clusterID int64) ([]models.Shop, error) {
	// Verificar que el cluster existe
	cluster, err := s.clusterRepo.GetByID(ctx, clusterID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if cluster == nil {
		return nil, models.ErrClusterNotFound
	}

	shops, err := s.shopRepo.GetByClusterID(ctx, clusterID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}

	return shops, nil
}

// ApplyMeasures aplica medidas a una tienda
func (s *shopService) ApplyMeasures(ctx context.Context, shopID int64, measureNames []string) error {
	// Verificar que la tienda existe
	shop, err := s.shopRepo.GetByID(ctx, shopID)
	if err != nil {
		return models.ErrDatabase(err)
	}
	if shop == nil {
		return models.ErrShopNotFound
	}

	// Aplicar cada medida
	for _, measureName := range measureNames {
		// Verificar que la medida existe
		measure, err := s.measureRepo.GetByName(ctx, measureName)
		if err != nil {
			return models.ErrDatabase(err)
		}
		if measure == nil {
			return models.ErrMeasureNotFound
		}

		if err := s.shopRepo.ApplyMeasure(ctx, shopID, measureName); err != nil {
			return models.ErrDatabase(err)
		}
	}

	// Recalcular riesgo y cobertura
	if err := s.updateShopRisk(ctx, shop); err != nil {
		// Log pero no fallar
	}

	return nil
}

// RemoveMeasure elimina una medida de una tienda
func (s *shopService) RemoveMeasure(ctx context.Context, shopID int64, measureName string) error {
	if err := s.shopRepo.RemoveMeasure(ctx, shopID, measureName); err != nil {
		return models.ErrDatabase(err)
	}
	return nil
}

// GetRiskAssessment obtiene la evaluación de riesgos de una tienda
func (s *shopService) GetRiskAssessment(ctx context.Context, shopID int64) (*models.RiskAssessmentResponse, error) {
	shop, err := s.shopRepo.GetByID(ctx, shopID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if shop == nil {
		return nil, models.ErrShopNotFound
	}

	risks, err := s.riskRepo.GetByClusterID(ctx, shop.ClusterID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}

	// Calcular nivel de riesgo
	riskLevel := getRiskLevel(shop.TotalRisk)

	return &models.RiskAssessmentResponse{
		ShopID:           shopID,
		OverallRiskScore: shop.TotalRisk,
		RiskLevel:        riskLevel,
		Risks:            risks,
		LastUpdated:      "2025-12-15T00:00:00Z",
	}, nil
}

// updateShopRisk actualiza el riesgo total de una tienda
func (s *shopService) updateShopRisk(ctx context.Context, shop *models.Shop) error {
	risks, err := s.riskRepo.GetByClusterID(ctx, shop.ClusterID)
	if err != nil {
		return err
	}

	// Calcular riesgo total (promedio ponderado de todos los riesgos)
	if len(risks) == 0 {
		shop.TotalRisk = 0
		return s.shopRepo.Update(ctx, shop)
	}

	var totalScore float64
	for _, risk := range risks {
		totalScore += risk.RiskScore
	}
	shop.TotalRisk = totalScore / float64(len(risks))

	// Calcular cobertura basada en medidas aplicadas
	appliedMeasures, err := s.shopRepo.GetAppliedMeasures(ctx, shop.ID)
	if err != nil {
		return err
	}

	allMeasures, err := s.measureRepo.List(ctx)
	if err != nil {
		return err
	}

	if len(allMeasures) > 0 {
		shop.TaxonomyCoverage = float64(len(appliedMeasures)) / float64(len(allMeasures)) * 100
	}

	return s.shopRepo.Update(ctx, shop)
}

// getRiskLevel convierte un score numérico a nivel de riesgo
func getRiskLevel(score float64) models.Level {
	switch {
	case score < 0.2:
		return models.LevelVeryLow
	case score < 0.4:
		return models.LevelLow
	case score < 0.6:
		return models.LevelMedium
	case score < 0.8:
		return models.LevelHigh
	default:
		return models.LevelVeryHigh
	}
}
