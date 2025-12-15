// Package services contiene los servicios de la aplicación.
package services

import (
	"context"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/repository"
)

// ClusterService define las operaciones para clusters
type ClusterService interface {
	GetByID(ctx context.Context, id int64) (*models.ClusterWithRisks, error)
	List(ctx context.Context) ([]models.Cluster, error)
}

// clusterService implementa ClusterService
type clusterService struct {
	clusterRepo repository.ClusterRepository
}

// NewClusterService crea una instancia de ClusterService
func NewClusterService(repo repository.ClusterRepository) ClusterService {
	return &clusterService{clusterRepo: repo}
}

func (s *clusterService) GetByID(ctx context.Context, id int64) (*models.ClusterWithRisks, error) {
	cluster, err := s.clusterRepo.GetWithRisks(ctx, id)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if cluster == nil {
		return nil, models.ErrClusterNotFound
	}
	return cluster, nil
}

func (s *clusterService) List(ctx context.Context) ([]models.Cluster, error) {
	clusters, err := s.clusterRepo.List(ctx)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	return clusters, nil
}

// MeasureService define las operaciones para medidas
type MeasureService interface {
	GetByName(ctx context.Context, name string) (*models.Measure, error)
	List(ctx context.Context) ([]models.Measure, error)
	GetByType(ctx context.Context, measureType models.MeasureType) ([]models.Measure, error)
	GetApplicableForShop(ctx context.Context, shopID int64) ([]models.Measure, error)
}

// measureService implementa MeasureService
type measureService struct {
	measureRepo repository.MeasureRepository
	shopRepo    repository.ShopRepository
}

// NewMeasureService crea una instancia de MeasureService
func NewMeasureService(measureRepo repository.MeasureRepository, shopRepo repository.ShopRepository) MeasureService {
	return &measureService{measureRepo: measureRepo, shopRepo: shopRepo}
}

func (s *measureService) GetByName(ctx context.Context, name string) (*models.Measure, error) {
	measure, err := s.measureRepo.GetByName(ctx, name)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if measure == nil {
		return nil, models.ErrMeasureNotFound
	}
	return measure, nil
}

func (s *measureService) List(ctx context.Context) ([]models.Measure, error) {
	measures, err := s.measureRepo.List(ctx)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	return measures, nil
}

func (s *measureService) GetByType(ctx context.Context, measureType models.MeasureType) ([]models.Measure, error) {
	measures, err := s.measureRepo.GetByType(ctx, measureType)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	return measures, nil
}

func (s *measureService) GetApplicableForShop(ctx context.Context, shopID int64) ([]models.Measure, error) {
	// Verificar que la tienda existe
	shop, err := s.shopRepo.GetByID(ctx, shopID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if shop == nil {
		return nil, models.ErrShopNotFound
	}

	measures, err := s.measureRepo.GetApplicableForShop(ctx, shopID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	return measures, nil
}

// RiskService define las operaciones para riesgos
type RiskService interface {
	GetByID(ctx context.Context, id int64) (*models.Risk, error)
	List(ctx context.Context) ([]models.Risk, error)
	GetByCluster(ctx context.Context, clusterID int64) ([]models.RiskDetail, error)
}

// riskService implementa RiskService
type riskService struct {
	riskRepo    repository.RiskRepository
	clusterRepo repository.ClusterRepository
}

// NewRiskService crea una instancia de RiskService
func NewRiskService(riskRepo repository.RiskRepository, clusterRepo repository.ClusterRepository) RiskService {
	return &riskService{riskRepo: riskRepo, clusterRepo: clusterRepo}
}

func (s *riskService) GetByID(ctx context.Context, id int64) (*models.Risk, error) {
	risk, err := s.riskRepo.GetByID(ctx, id)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if risk == nil {
		return nil, models.ErrRiskNotFound
	}
	return risk, nil
}

func (s *riskService) List(ctx context.Context) ([]models.Risk, error) {
	risks, err := s.riskRepo.List(ctx)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	return risks, nil
}

func (s *riskService) GetByCluster(ctx context.Context, clusterID int64) ([]models.RiskDetail, error) {
	// Verificar que el cluster existe
	cluster, err := s.clusterRepo.GetByID(ctx, clusterID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if cluster == nil {
		return nil, models.ErrClusterNotFound
	}

	risks, err := s.riskRepo.GetByClusterID(ctx, clusterID)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	return risks, nil
}

// DashboardService proporciona estadísticas del dashboard
type DashboardService interface {
	GetStats(ctx context.Context) (*models.DashboardStats, error)
}

// dashboardService implementa DashboardService
type dashboardService struct {
	shopRepo repository.ShopRepository
}

// NewDashboardService crea una instancia de DashboardService
func NewDashboardService(shopRepo repository.ShopRepository) DashboardService {
	return &dashboardService{shopRepo: shopRepo}
}

func (s *dashboardService) GetStats(ctx context.Context) (*models.DashboardStats, error) {
	stats, err := s.shopRepo.GetStats(ctx)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	return stats, nil
}
