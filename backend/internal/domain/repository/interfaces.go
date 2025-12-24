// Package repository define las interfaces de los repositorios.
// Siguiendo el principio de inversión de dependencias (DIP),
// las interfaces están en el dominio y las implementaciones en infrastructure.
package repository

import (
	"context"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
)

// ShopRepository define las operaciones de acceso a datos para tiendas
type ShopRepository interface {
	// CRUD básico
	Create(ctx context.Context, shop *models.Shop) error
	GetByID(ctx context.Context, id int64) (*models.Shop, error)
	Update(ctx context.Context, shop *models.Shop) error
	Delete(ctx context.Context, id int64) error

	// Consultas
	List(ctx context.Context, filter *models.ShopFilterRequest) ([]models.Shop, int64, error)
	GetByClusterID(ctx context.Context, clusterID int64) ([]models.Shop, error)
	GetWithDetails(ctx context.Context, id int64) (*models.ShopWithDetails, error)

	// Medidas
	GetAppliedMeasures(ctx context.Context, shopID int64) ([]models.Measure, error)
	ApplyMeasure(ctx context.Context, shopID int64, measureName string) error
	RemoveMeasure(ctx context.Context, shopID int64, measureName string) error

	// Estadísticas
	GetStats(ctx context.Context) (*models.DashboardStats, error)
}

// ClusterRepository define las operaciones de acceso a datos para clusters
type ClusterRepository interface {
	Create(ctx context.Context, cluster *models.Cluster) error
	GetByID(ctx context.Context, id int64) (*models.Cluster, error)
	Update(ctx context.Context, cluster *models.Cluster) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context) ([]models.Cluster, error)
	GetWithRisks(ctx context.Context, id int64) (*models.ClusterWithRisks, error)
}

// RiskRepository define las operaciones de acceso a datos para riesgos
type RiskRepository interface {
	Create(ctx context.Context, risk *models.Risk) error
	GetByID(ctx context.Context, id int64) (*models.Risk, error)
	GetByName(ctx context.Context, name string) (*models.Risk, error)
	List(ctx context.Context) ([]models.Risk, error)
	GetByClusterID(ctx context.Context, clusterID int64) ([]models.RiskDetail, error)
}

// MeasureRepository define las operaciones de acceso a datos para medidas
type MeasureRepository interface {
	Create(ctx context.Context, measure *models.Measure) error
	GetByName(ctx context.Context, name string) (*models.Measure, error)
	Update(ctx context.Context, measure *models.Measure) error
	Delete(ctx context.Context, name string) error
	List(ctx context.Context) ([]models.Measure, error)
	GetByType(ctx context.Context, measureType models.MeasureType) ([]models.Measure, error)
	GetByRisk(ctx context.Context, riskName string) ([]models.Measure, error)
	GetApplicableForShop(ctx context.Context, shopID int64) ([]models.Measure, error)
}

// ClusterRiskRepository define operaciones para la relación cluster-riesgo
type ClusterRiskRepository interface {
	Create(ctx context.Context, cr *models.ClusterRisk) error
	Update(ctx context.Context, cr *models.ClusterRisk) error
	Delete(ctx context.Context, clusterID, riskID int64) error
	GetByCluster(ctx context.Context, clusterID int64) ([]models.ClusterRisk, error)
	GetByRisk(ctx context.Context, riskID int64) ([]models.ClusterRisk, error)
}

// UserRepository define las operaciones de acceso a datos para usuarios
type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id int64) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id int64) error
	EmailExists(ctx context.Context, email string) (bool, error)
}

// CountryRepository define las operaciones de acceso a datos para países
type CountryRepository interface {
	Create(ctx context.Context, country *models.Country) error
	GetByName(ctx context.Context, name string) (*models.Country, error)
	List(ctx context.Context) ([]models.Country, error)
	Delete(ctx context.Context, name string) error
}

// Transaction define la interfaz para manejo de transacciones
type Transaction interface {
	Begin(ctx context.Context) (Transaction, error)
	Commit() error
	Rollback() error
}

// UnitOfWork agrupa todos los repositorios para operaciones transaccionales
type UnitOfWork interface {
	Transaction
	Shops() ShopRepository
	Clusters() ClusterRepository
	Risks() RiskRepository
	Measures() MeasureRepository
	ClusterRisks() ClusterRiskRepository
	Users() UserRepository
	Countries() CountryRepository
}
