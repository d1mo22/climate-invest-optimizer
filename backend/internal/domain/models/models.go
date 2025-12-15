// Package models contiene las entidades del dominio de la aplicación.
// Estas estructuras representan los objetos de negocio principales.
package models

import "time"

// Level representa los niveles de riesgo o severidad
type Level string

const (
	LevelVeryLow  Level = "very_low"
	LevelLow      Level = "low"
	LevelMedium   Level = "medium"
	LevelHigh     Level = "high"
	LevelVeryHigh Level = "very_high"
)

// MeasureType representa el tipo de medida preventiva
type MeasureType string

const (
	MeasureTypeNatural    MeasureType = "natural"
	MeasureTypeMaterial   MeasureType = "material"
	MeasureTypeImmaterial MeasureType = "immaterial"
)

// Shop representa un inmueble/tienda en el sistema
type Shop struct {
	ID               int64     `json:"id" db:"id"`
	Location         string    `json:"location" db:"location"`
	CoordinateX      float64   `json:"coordinate_x" db:"coordinate_x"`
	CoordinateY      float64   `json:"coordinate_y" db:"coordinate_y"`
	TotalRisk        float64   `json:"total_risk" db:"totalRisk"`
	TaxonomyCoverage float64   `json:"taxonomy_coverage" db:"taxonomyCoverage"`
	Surface          float64   `json:"surface" db:"surface"`
	CarbonFootprint  float64   `json:"carbon_footprint" db:"carbonFootprint"`
	ClusterID        int64     `json:"cluster_id" db:"cluster_id"`
	CreatedAt        time.Time `json:"created_at,omitempty" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

// Cluster representa una agrupación geográfica de tiendas
type Cluster struct {
	ID           int64   `json:"id" db:"id"`
	Name         string  `json:"name" db:"name"`
	CoordinatesX float64 `json:"coordinates_x" db:"coordinates_x"`
	CoordinatesY float64 `json:"coordinates_y" db:"coordinates_y"`
}

// Risk representa un riesgo climático
type Risk struct {
	ID   int64  `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
	SVG  string `json:"svg,omitempty" db:"svg"`
}

// ClusterRisk representa la relación entre un cluster y un riesgo
type ClusterRisk struct {
	ClusterID   int64 `json:"cluster_id" db:"cluster_id"`
	RiskID      int64 `json:"risk_id" db:"risk_id"`
	Exposure    Level `json:"exposure" db:"exposure"`
	Sensitivity Level `json:"sensitivity" db:"sensitivity"`
	Consequence Level `json:"consequence" db:"consequence"`
	Probability Level `json:"probability" db:"probability"`
}

// Measure representa una medida preventiva
type Measure struct {
	Name          string      `json:"name" db:"name"`
	EstimatedCost float64     `json:"estimated_cost" db:"estimatedCost"`
	Type          MeasureType `json:"type" db:"type"`
}

// RiskMeasure representa la relación entre un riesgo y una medida
type RiskMeasure struct {
	RiskName    string `json:"risk_name" db:"risk_name"`
	MeasureName string `json:"measure_name" db:"measure_name"`
}

// ShopMeasure representa las medidas aplicadas a una tienda
type ShopMeasure struct {
	ShopID      int64  `json:"shop_id" db:"shop_id"`
	MeasureName string `json:"measure_name" db:"measure_name"`
}

// Country representa un país
type Country struct {
	Name string `json:"name" db:"name"`
}

// User representa un usuario del sistema
type User struct {
	ID        int64     `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"` // Nunca exponer el password en JSON
	Role      UserRole  `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// UserRole representa el rol del usuario
type UserRole string

const (
	RoleAdmin   UserRole = "admin"
	RoleManager UserRole = "manager"
	RoleViewer  UserRole = "viewer"
)

// ShopWithDetails representa una tienda con información extendida
type ShopWithDetails struct {
	Shop
	ClusterName string        `json:"cluster_name"`
	Risks       []RiskDetail  `json:"risks,omitempty"`
	Measures    []Measure     `json:"applied_measures,omitempty"`
}

// RiskDetail representa un riesgo con su evaluación completa
type RiskDetail struct {
	Risk
	Exposure    Level   `json:"exposure"`
	Sensitivity Level   `json:"sensitivity"`
	Consequence Level   `json:"consequence"`
	Probability Level   `json:"probability"`
	RiskScore   float64 `json:"risk_score"`
}

// ClusterWithRisks representa un cluster con sus riesgos asociados
type ClusterWithRisks struct {
	Cluster
	Risks []RiskDetail `json:"risks"`
}
