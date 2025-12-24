// Package postgres implementa los repositorios usando PostgreSQL/Supabase.
package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
)

// MeasureRepository implementa repository.MeasureRepository para PostgreSQL
type MeasureRepository struct {
	db *sql.DB
}

// NewMeasureRepository crea una nueva instancia del repositorio
func NewMeasureRepository(db *sql.DB) *MeasureRepository {
	return &MeasureRepository{db: db}
}

// Create inserta una nueva medida
func (r *MeasureRepository) Create(ctx context.Context, measure *models.Measure) error {
	query := `
		INSERT INTO "Measure" (name, "estimatedCost", type)
		VALUES ($1, $2, $3)
	`
	_, err := r.db.ExecContext(ctx, query, measure.Name, measure.EstimatedCost, measure.Type)
	if err != nil {
		return fmt.Errorf("failed to create measure: %w", err)
	}
	return nil
}

// GetByName obtiene una medida por su nombre
func (r *MeasureRepository) GetByName(ctx context.Context, name string) (*models.Measure, error) {
	query := `SELECT name, "estimatedCost", type FROM "Measure" WHERE name = $1`
	measure := &models.Measure{}
	err := r.db.QueryRowContext(ctx, query, name).Scan(&measure.Name, &measure.EstimatedCost, &measure.Type)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get measure: %w", err)
	}
	return measure, nil
}

// Update actualiza una medida existente
func (r *MeasureRepository) Update(ctx context.Context, measure *models.Measure) error {
	query := `UPDATE "Measure" SET "estimatedCost" = $1, type = $2 WHERE name = $3`
	result, err := r.db.ExecContext(ctx, query, measure.EstimatedCost, measure.Type, measure.Name)
	if err != nil {
		return fmt.Errorf("failed to update measure: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("measure not found")
	}
	return nil
}

// Delete elimina una medida
func (r *MeasureRepository) Delete(ctx context.Context, name string) error {
	// Primero eliminar las relaciones
	_, _ = r.db.ExecContext(ctx, `DELETE FROM "Shop_measure" WHERE measure_name = $1`, name)
	_, _ = r.db.ExecContext(ctx, `DELETE FROM "Risk_measures" WHERE measure_name = $1`, name)

	result, err := r.db.ExecContext(ctx, `DELETE FROM "Measure" WHERE name = $1`, name)
	if err != nil {
		return fmt.Errorf("failed to delete measure: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("measure not found")
	}
	return nil
}

// List obtiene todas las medidas
func (r *MeasureRepository) List(ctx context.Context) ([]models.Measure, error) {
	query := `SELECT name, "estimatedCost", type FROM "Measure" ORDER BY "estimatedCost"`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list measures: %w", err)
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

// GetByType obtiene medidas por tipo
func (r *MeasureRepository) GetByType(ctx context.Context, measureType models.MeasureType) ([]models.Measure, error) {
	query := `SELECT name, "estimatedCost", type FROM "Measure" WHERE type = $1 ORDER BY "estimatedCost"`
	rows, err := r.db.QueryContext(ctx, query, measureType)
	if err != nil {
		return nil, fmt.Errorf("failed to get measures by type: %w", err)
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

// GetByRisk obtiene medidas aplicables a un riesgo específico
func (r *MeasureRepository) GetByRisk(ctx context.Context, riskName string) ([]models.Measure, error) {
	query := `
		SELECT m.name, m."estimatedCost", m.type
		FROM "Measure" m
		JOIN "Risk_measures" rm ON m.name = rm.measure_name
		WHERE rm.risk_name = $1
		ORDER BY m."estimatedCost"
	`
	rows, err := r.db.QueryContext(ctx, query, riskName)
	if err != nil {
		return nil, fmt.Errorf("failed to get measures by risk: %w", err)
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

// GetApplicableForShop obtiene medidas aplicables a una tienda (no ya aplicadas)
func (r *MeasureRepository) GetApplicableForShop(ctx context.Context, shopID int64) ([]models.Measure, error) {
	query := `
		SELECT m.name, m."estimatedCost", m.type
		FROM "Measure" m
		WHERE m.name NOT IN (
			SELECT measure_name FROM "Shop_measure" WHERE shop_id = $1
		)
		ORDER BY m."estimatedCost"
	`
	rows, err := r.db.QueryContext(ctx, query, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to get applicable measures: %w", err)
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

// ClusterRepository implementa repository.ClusterRepository
type ClusterRepository struct {
	db *sql.DB
}

// NewClusterRepository crea una nueva instancia
func NewClusterRepository(db *sql.DB) *ClusterRepository {
	return &ClusterRepository{db: db}
}

// Create inserta un nuevo cluster
func (r *ClusterRepository) Create(ctx context.Context, cluster *models.Cluster) error {
	query := `
		INSERT INTO "Cluster" (name, coordinates_x, coordinates_y)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	return r.db.QueryRowContext(ctx, query,
		cluster.Name, cluster.CoordinatesX, cluster.CoordinatesY,
	).Scan(&cluster.ID)
}

// GetByID obtiene un cluster por ID
func (r *ClusterRepository) GetByID(ctx context.Context, id int64) (*models.Cluster, error) {
	query := `SELECT id, name, coordinates_x, coordinates_y FROM "Cluster" WHERE id = $1`
	cluster := &models.Cluster{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&cluster.ID, &cluster.Name, &cluster.CoordinatesX, &cluster.CoordinatesY,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	return cluster, nil
}

// Update actualiza un cluster
func (r *ClusterRepository) Update(ctx context.Context, cluster *models.Cluster) error {
	query := `UPDATE "Cluster" SET name = $1, coordinates_x = $2, coordinates_y = $3 WHERE id = $4`
	result, err := r.db.ExecContext(ctx, query,
		cluster.Name, cluster.CoordinatesX, cluster.CoordinatesY, cluster.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update cluster: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("cluster not found")
	}
	return nil
}

// Delete elimina un cluster
func (r *ClusterRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM "Cluster" WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete cluster: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("cluster not found")
	}
	return nil
}

// List obtiene todos los clusters
func (r *ClusterRepository) List(ctx context.Context) ([]models.Cluster, error) {
	query := `SELECT id, name, coordinates_x, coordinates_y FROM "Cluster" ORDER BY name`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list clusters: %w", err)
	}
	defer rows.Close()

	var clusters []models.Cluster
	for rows.Next() {
		var c models.Cluster
		if err := rows.Scan(&c.ID, &c.Name, &c.CoordinatesX, &c.CoordinatesY); err != nil {
			return nil, fmt.Errorf("failed to scan cluster: %w", err)
		}
		clusters = append(clusters, c)
	}
	return clusters, nil
}

// GetWithRisks obtiene un cluster con sus riesgos asociados
func (r *ClusterRepository) GetWithRisks(ctx context.Context, id int64) (*models.ClusterWithRisks, error) {
	cluster, err := r.GetByID(ctx, id)
	if err != nil || cluster == nil {
		return nil, err
	}

	result := &models.ClusterWithRisks{Cluster: *cluster}

	// Obtener riesgos del cluster
	query := `
		SELECT r.id, r.name, r.svg, cr.exposure, cr.sensitivity, cr.consequence, cr.probability
		FROM "Risk" r
		JOIN "Cluster_risk" cr ON r.id = cr.risk_id
		WHERE cr.cluster_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster risks: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var rd models.RiskDetail
		var svg sql.NullString
		if err := rows.Scan(&rd.ID, &rd.Name, &svg, &rd.Exposure, &rd.Sensitivity, &rd.Consequence, &rd.Probability); err != nil {
			return nil, fmt.Errorf("failed to scan risk detail: %w", err)
		}
		rd.SVG = svg.String
		rd.RiskScore = calculateRiskScore(rd)
		result.Risks = append(result.Risks, rd)
	}

	return result, nil
}

// RiskRepository implementa repository.RiskRepository
type RiskRepository struct {
	db *sql.DB
}

// NewRiskRepository crea una nueva instancia
func NewRiskRepository(db *sql.DB) *RiskRepository {
	return &RiskRepository{db: db}
}

// Create inserta un nuevo riesgo
func (r *RiskRepository) Create(ctx context.Context, risk *models.Risk) error {
	query := `INSERT INTO "Risk" (name, svg, id) VALUES ($1, $2, $3)`
	_, err := r.db.ExecContext(ctx, query, risk.Name, risk.SVG, risk.ID)
	return err
}

// GetByID obtiene un riesgo por ID
func (r *RiskRepository) GetByID(ctx context.Context, id int64) (*models.Risk, error) {
	query := `SELECT id, name, svg FROM "Risk" WHERE id = $1`
	risk := &models.Risk{}
	var svg sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(&risk.ID, &risk.Name, &svg)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	risk.SVG = svg.String
	return risk, nil
}

// GetByName obtiene un riesgo por nombre
func (r *RiskRepository) GetByName(ctx context.Context, name string) (*models.Risk, error) {
	query := `SELECT id, name, svg FROM "Risk" WHERE name = $1`
	risk := &models.Risk{}
	var svg sql.NullString
	err := r.db.QueryRowContext(ctx, query, name).Scan(&risk.ID, &risk.Name, &svg)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	risk.SVG = svg.String
	return risk, nil
}

// List obtiene todos los riesgos
func (r *RiskRepository) List(ctx context.Context) ([]models.Risk, error) {
	query := `SELECT id, name, svg FROM "Risk" ORDER BY name`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var risks []models.Risk
	for rows.Next() {
		var risk models.Risk
		var svg sql.NullString
		if err := rows.Scan(&risk.ID, &risk.Name, &svg); err != nil {
			return nil, err
		}
		risk.SVG = svg.String
		risks = append(risks, risk)
	}
	return risks, nil
}

// GetByClusterID obtiene los riesgos de un cluster con detalles
func (r *RiskRepository) GetByClusterID(ctx context.Context, clusterID int64) ([]models.RiskDetail, error) {
	query := `
		SELECT r.id, r.name, r.svg, cr.exposure, cr.sensitivity, cr.consequence, cr.probability
		FROM "Risk" r
		JOIN "Cluster_risk" cr ON r.id = cr.risk_id
		WHERE cr.cluster_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, clusterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var risks []models.RiskDetail
	for rows.Next() {
		var rd models.RiskDetail
		var svg sql.NullString
		if err := rows.Scan(&rd.ID, &rd.Name, &svg, &rd.Exposure, &rd.Sensitivity, &rd.Consequence, &rd.Probability); err != nil {
			return nil, err
		}
		rd.SVG = svg.String
		rd.RiskScore = calculateRiskScore(rd)
		risks = append(risks, rd)
	}
	return risks, nil
}

// calculateRiskScore calcula el score de riesgo basado en los factores
func calculateRiskScore(rd models.RiskDetail) float64 {
	// Convertir niveles a valores numéricos
	levelToValue := func(l models.Level) float64 {
		switch l {
		case models.LevelVeryLow:
			return 0.1
		case models.LevelLow:
			return 0.3
		case models.LevelMedium:
			return 0.5
		case models.LevelHigh:
			return 0.7
		case models.LevelVeryHigh:
			return 0.9
		default:
			return 0.5
		}
	}

	// Fórmula: Risk = (Exposure * Sensitivity) * (Consequence * Probability)
	vulnerability := levelToValue(rd.Exposure) * levelToValue(rd.Sensitivity)
	impact := levelToValue(rd.Consequence) * levelToValue(rd.Probability)

	return vulnerability * impact
}
