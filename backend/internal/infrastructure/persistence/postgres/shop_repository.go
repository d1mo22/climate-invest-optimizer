// Package postgres implementa los repositorios usando PostgreSQL/Supabase.
package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
)

// ShopRepository implementa repository.ShopRepository para PostgreSQL
type ShopRepository struct {
	db *sql.DB
}

// NewShopRepository crea una nueva instancia del repositorio
func NewShopRepository(db *sql.DB) *ShopRepository {
	return &ShopRepository{db: db}
}

// Create inserta una nueva tienda
func (r *ShopRepository) Create(ctx context.Context, shop *models.Shop) error {
	query := `
		INSERT INTO "Shop" (location, utm_north, utm_east, surface, "carbonFootprint", cluster_id, "totalRisk", "taxonomyCoverage")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`
	err := r.db.QueryRowContext(ctx, query,
		shop.Location,
		shop.UtmNorth,
		shop.UtmEast,
		shop.Surface,
		shop.CarbonFootprint,
		shop.ClusterID,
		shop.TotalRisk,
		shop.TaxonomyCoverage,
	).Scan(&shop.ID)

	if err != nil {
		return fmt.Errorf("failed to create shop: %w", err)
	}
	return nil
}

// GetByID obtiene una tienda por su ID
func (r *ShopRepository) GetByID(ctx context.Context, id int64) (*models.Shop, error) {
	query := `
		SELECT id, location, utm_north, utm_east, COALESCE("totalRisk", 0), COALESCE("taxonomyCoverage", 0), COALESCE(surface, 0), COALESCE("carbonFootprint", 0), cluster_id
		FROM "Shop"
		WHERE id = $1
	`
	shop := &models.Shop{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&shop.ID,
		&shop.Location,
		&shop.UtmNorth,
		&shop.UtmEast,
		&shop.TotalRisk,
		&shop.TaxonomyCoverage,
		&shop.Surface,
		&shop.CarbonFootprint,
		&shop.ClusterID,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get shop: %w", err)
	}
	return shop, nil
}

// Update actualiza una tienda existente
func (r *ShopRepository) Update(ctx context.Context, shop *models.Shop) error {
	query := `
		UPDATE "Shop"
		SET location = $1, utm_north = $2, utm_east = $3, surface = $4, 
		    "carbonFootprint" = $5, cluster_id = $6, "totalRisk" = $7, "taxonomyCoverage" = $8
		WHERE id = $9
	`
	result, err := r.db.ExecContext(ctx, query,
		shop.Location,
		shop.UtmNorth,
		shop.UtmEast,
		shop.Surface,
		shop.CarbonFootprint,
		shop.ClusterID,
		shop.TotalRisk,
		shop.TaxonomyCoverage,
		shop.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update shop: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("shop not found")
	}
	return nil
}

// Delete elimina una tienda
func (r *ShopRepository) Delete(ctx context.Context, id int64) error {
	// Primero eliminar las medidas asociadas
	_, err := r.db.ExecContext(ctx, `DELETE FROM "Shop_measure" WHERE shop_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete shop measures: %w", err)
	}

	result, err := r.db.ExecContext(ctx, `DELETE FROM "Shop" WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete shop: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("shop not found")
	}
	return nil
}

// List obtiene una lista paginada de tiendas con filtros opcionales
func (r *ShopRepository) List(ctx context.Context, filter *models.ShopFilterRequest) ([]models.Shop, int64, error) {
	// Construir query dinámicamente
	baseQuery := `SELECT id, location, utm_north, utm_east, COALESCE("totalRisk", 0), COALESCE("taxonomyCoverage", 0), COALESCE(surface, 0), COALESCE("carbonFootprint", 0), cluster_id FROM "Shop"`
	countQuery := `SELECT COUNT(*) FROM "Shop"`

	var conditions []string
	var args []interface{}
	argIndex := 1

	if filter != nil {
		if filter.ClusterID != nil {
			conditions = append(conditions, fmt.Sprintf("cluster_id = $%d", argIndex))
			args = append(args, *filter.ClusterID)
			argIndex++
		}
		if filter.MinRisk != nil {
			conditions = append(conditions, fmt.Sprintf(`"totalRisk" >= $%d`, argIndex))
			args = append(args, *filter.MinRisk)
			argIndex++
		}
		if filter.MaxRisk != nil {
			conditions = append(conditions, fmt.Sprintf(`"totalRisk" <= $%d`, argIndex))
			args = append(args, *filter.MaxRisk)
			argIndex++
		}
		if filter.MinSurface != nil {
			conditions = append(conditions, fmt.Sprintf("surface >= $%d", argIndex))
			args = append(args, *filter.MinSurface)
			argIndex++
		}
		if filter.MaxSurface != nil {
			conditions = append(conditions, fmt.Sprintf("surface <= $%d", argIndex))
			args = append(args, *filter.MaxSurface)
			argIndex++
		}
		if filter.SearchQuery != "" {
			conditions = append(conditions, fmt.Sprintf("location ILIKE $%d", argIndex))
			args = append(args, "%"+filter.SearchQuery+"%")
			argIndex++
		}
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	// Obtener total
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery+whereClause, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count shops: %w", err)
	}

	// Añadir ordenación y paginación
	orderClause := " ORDER BY id"
	if filter != nil && filter.SortBy != "" {
		validColumns := map[string]string{
			"id":        "id",
			"location":  "location",
			"risk":      `"totalRisk"`,
			"surface":   "surface",
		}
		if col, ok := validColumns[filter.SortBy]; ok {
			orderClause = fmt.Sprintf(" ORDER BY %s", col)
			if filter.SortDir == "desc" {
				orderClause += " DESC"
			}
		}
	}

	// Paginación
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
	offset := (page - 1) * pageSize

	paginationClause := fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, pageSize, offset)

	// Ejecutar query
	rows, err := r.db.QueryContext(ctx, baseQuery+whereClause+orderClause+paginationClause, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list shops: %w", err)
	}
	defer rows.Close()

	var shops []models.Shop
	for rows.Next() {
		var shop models.Shop
		err := rows.Scan(
			&shop.ID,
			&shop.Location,
			&shop.UtmNorth,
			&shop.UtmEast,
			&shop.TotalRisk,
			&shop.TaxonomyCoverage,
			&shop.Surface,
			&shop.CarbonFootprint,
			&shop.ClusterID,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan shop: %w", err)
		}
		shops = append(shops, shop)
	}

	return shops, total, nil
}

// GetByClusterID obtiene todas las tiendas de un cluster
func (r *ShopRepository) GetByClusterID(ctx context.Context, clusterID int64) ([]models.Shop, error) {
	query := `
		SELECT id, location, utm_north, utm_east, COALESCE("totalRisk", 0), COALESCE("taxonomyCoverage", 0), COALESCE(surface, 0), COALESCE("carbonFootprint", 0), cluster_id
		FROM "Shop"
		WHERE cluster_id = $1
		ORDER BY id
	`
	rows, err := r.db.QueryContext(ctx, query, clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get shops by cluster: %w", err)
	}
	defer rows.Close()

	var shops []models.Shop
	for rows.Next() {
		var shop models.Shop
		err := rows.Scan(
			&shop.ID,
			&shop.Location,
			&shop.UtmNorth,
			&shop.UtmEast,
			&shop.TotalRisk,
			&shop.TaxonomyCoverage,
			&shop.Surface,
			&shop.CarbonFootprint,
			&shop.ClusterID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan shop: %w", err)
		}
		shops = append(shops, shop)
	}

	return shops, nil
}

// GetWithDetails obtiene una tienda con información extendida
func (r *ShopRepository) GetWithDetails(ctx context.Context, id int64) (*models.ShopWithDetails, error) {
	query := `
		SELECT s.id, s.location, s.utm_north, s.utm_east, COALESCE(s."totalRisk", 0), 
		       COALESCE(s."taxonomyCoverage", 0), COALESCE(s.surface, 0), COALESCE(s."carbonFootprint", 0), s.cluster_id,
		       c.name as cluster_name
		FROM "Shop" s
		JOIN "Cluster" c ON s.cluster_id = c.id
		WHERE s.id = $1
	`
	shop := &models.ShopWithDetails{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&shop.ID,
		&shop.Location,
		&shop.UtmNorth,
		&shop.UtmEast,
		&shop.TotalRisk,
		&shop.TaxonomyCoverage,
		&shop.Surface,
		&shop.CarbonFootprint,
		&shop.ClusterID,
		&shop.ClusterName,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get shop with details: %w", err)
	}

	// Obtener medidas aplicadas
	measures, err := r.GetAppliedMeasures(ctx, id)
	if err != nil {
		return nil, err
	}
	shop.Measures = measures

	return shop, nil
}

// GetAppliedMeasures obtiene las medidas aplicadas a una tienda
func (r *ShopRepository) GetAppliedMeasures(ctx context.Context, shopID int64) ([]models.Measure, error) {
	query := `
		SELECT m.name, m."estimatedCost", m.type
		FROM "Measure" m
		JOIN "Shop_measure" sm ON m.name = sm.measure_name
		WHERE sm.shop_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to get applied measures: %w", err)
	}
	defer rows.Close()

	var measures []models.Measure
	for rows.Next() {
		var m models.Measure
		if err := rows.Scan(&m.Name, &m.EstimatedCost, &m.Type); err != nil {
			return nil, fmt.Errorf("failed to scan measure: %w", err)
		}
		measures = append(measures, m)
	}

	return measures, nil
}

// ApplyMeasure aplica una medida a una tienda
func (r *ShopRepository) ApplyMeasure(ctx context.Context, shopID int64, measureName string) error {
	query := `INSERT INTO "Shop_measure" (shop_id, measure_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := r.db.ExecContext(ctx, query, shopID, measureName)
	if err != nil {
		return fmt.Errorf("failed to apply measure: %w", err)
	}
	return nil
}

// RemoveMeasure elimina una medida de una tienda
func (r *ShopRepository) RemoveMeasure(ctx context.Context, shopID int64, measureName string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM "Shop_measure" WHERE shop_id = $1 AND measure_name = $2`, shopID, measureName)
	if err != nil {
		return fmt.Errorf("failed to remove measure: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("measure not applied to this shop")
	}
	return nil
}

// GetStats obtiene estadísticas generales
func (r *ShopRepository) GetStats(ctx context.Context) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	// Total de tiendas
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "Shop"`).Scan(&stats.TotalShops)
	if err != nil {
		return nil, fmt.Errorf("failed to count shops: %w", err)
	}

	// Total de clusters
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "Cluster"`).Scan(&stats.TotalClusters)
	if err != nil {
		return nil, fmt.Errorf("failed to count clusters: %w", err)
	}

	// Riesgo promedio
	err = r.db.QueryRowContext(ctx, `SELECT COALESCE(AVG("totalRisk"), 0) FROM "Shop"`).Scan(&stats.AverageRisk)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate average risk: %w", err)
	}

	// Tiendas de alto riesgo (riesgo > 0.7)
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "Shop" WHERE "totalRisk" > 0.7`).Scan(&stats.HighRiskShops)
	if err != nil {
		return nil, fmt.Errorf("failed to count high risk shops: %w", err)
	}

	// Total de medidas disponibles
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "Measure"`).Scan(&stats.TotalMeasures)
	if err != nil {
		return nil, fmt.Errorf("failed to count measures: %w", err)
	}

	// Medidas aplicadas
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "Shop_measure"`).Scan(&stats.AppliedMeasures)
	if err != nil {
		return nil, fmt.Errorf("failed to count applied measures: %w", err)
	}

	// Inversión total
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(m."estimatedCost"), 0)
		FROM "Shop_measure" sm
		JOIN "Measure" m ON sm.measure_name = m.name
	`).Scan(&stats.TotalInvestment)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate total investment: %w", err)
	}

	// Porcentaje de cobertura (tiendas con al menos una medida)
	var shopsWithMeasures int64
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT shop_id) FROM "Shop_measure"`).Scan(&shopsWithMeasures)
	if err != nil {
		return nil, fmt.Errorf("failed to count shops with measures: %w", err)
	}
	if stats.TotalShops > 0 {
		stats.CoveragePercentage = float64(shopsWithMeasures) / float64(stats.TotalShops) * 100
	}

	return stats, nil
}
