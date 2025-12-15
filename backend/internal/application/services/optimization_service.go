// Package services contiene la lógica de optimización de presupuesto.
package services

import (
	"context"
	"sort"
	"time"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/repository"
)

// OptimizationService define las operaciones de optimización de presupuesto
type OptimizationService interface {
	OptimizeBudget(ctx context.Context, req *models.OptimizeBudgetRequest) (*models.OptimizationResult, error)
}

// optimizationService implementa OptimizationService
type optimizationService struct {
	shopRepo    repository.ShopRepository
	measureRepo repository.MeasureRepository
	riskRepo    repository.RiskRepository
}

// NewOptimizationService crea una nueva instancia
func NewOptimizationService(
	shopRepo repository.ShopRepository,
	measureRepo repository.MeasureRepository,
	riskRepo repository.RiskRepository,
) OptimizationService {
	return &optimizationService{
		shopRepo:    shopRepo,
		measureRepo: measureRepo,
		riskRepo:    riskRepo,
	}
}

// measureCandidate representa una medida candidata para optimización
type measureCandidate struct {
	Measure       models.Measure
	ShopID        int64
	ShopLocation  string
	RiskReduction float64
	Efficiency    float64 // RiskReduction / Cost
	AffectedRisks []string
	Priority      int
}

// OptimizeBudget optimiza la distribución del presupuesto
// Implementa tres estrategias:
// 1. Greedy: Selecciona medidas con mejor ratio costo-beneficio
// 2. Knapsack: Optimización dinámica para maximizar reducción de riesgo
// 3. Weighted: Considera prioridades de riesgos definidas por el usuario
func (s *optimizationService) OptimizeBudget(ctx context.Context, req *models.OptimizeBudgetRequest) (*models.OptimizationResult, error) {
	startTime := time.Now()

	// Validaciones
	if req.MaxBudget <= 0 {
		return nil, models.ErrInvalidBudget
	}
	if len(req.ShopIDs) == 0 {
		return nil, models.ErrNoShopsSelected
	}

	// Obtener todas las medidas disponibles
	allMeasures, err := s.measureRepo.List(ctx)
	if err != nil {
		return nil, models.ErrDatabase(err)
	}
	if len(allMeasures) == 0 {
		return nil, models.ErrNoMeasuresAvailable
	}

	// Construir lista de candidatos (medidas por tienda)
	candidates, err := s.buildCandidates(ctx, req.ShopIDs, allMeasures, req.Priorities)
	if err != nil {
		return nil, err
	}

	if len(candidates) == 0 {
		return nil, models.ErrNoMeasuresAvailable
	}

	// Seleccionar estrategia
	strategy := req.Strategy
	if strategy == "" {
		strategy = "greedy" // Default
	}

	var selectedCandidates []measureCandidate
	switch strategy {
	case "knapsack":
		selectedCandidates = s.knapsackOptimization(candidates, req.MaxBudget)
	case "weighted":
		selectedCandidates = s.weightedOptimization(candidates, req.MaxBudget, req.Priorities)
	default: // greedy
		selectedCandidates = s.greedyOptimization(candidates, req.MaxBudget)
	}

	// Construir resultado
	result := s.buildResult(selectedCandidates, req.MaxBudget, strategy, startTime)

	return result, nil
}

// buildCandidates construye la lista de medidas candidatas para cada tienda
func (s *optimizationService) buildCandidates(
	ctx context.Context,
	shopIDs []int64,
	measures []models.Measure,
	priorities []int64,
) ([]measureCandidate, error) {
	var candidates []measureCandidate

	prioritySet := make(map[int64]bool)
	for _, p := range priorities {
		prioritySet[p] = true
	}

	for _, shopID := range shopIDs {
		shop, err := s.shopRepo.GetByID(ctx, shopID)
		if err != nil {
			return nil, models.ErrDatabase(err)
		}
		if shop == nil {
			continue
		}

		// Obtener medidas ya aplicadas
		appliedMeasures, err := s.shopRepo.GetAppliedMeasures(ctx, shopID)
		if err != nil {
			return nil, models.ErrDatabase(err)
		}
		appliedSet := make(map[string]bool)
		for _, m := range appliedMeasures {
			appliedSet[m.Name] = true
		}

		// Obtener riesgos del cluster
		risks, err := s.riskRepo.GetByClusterID(ctx, shop.ClusterID)
		if err != nil {
			return nil, models.ErrDatabase(err)
		}

		for _, measure := range measures {
			// Saltar si ya está aplicada
			if appliedSet[measure.Name] {
				continue
			}

			// Calcular reducción de riesgo estimada
			riskReduction := s.estimateRiskReduction(measure, risks, shop.TotalRisk)
			if riskReduction <= 0 {
				continue
			}

			// Determinar riesgos afectados
			affectedRisks := s.getAffectedRisks(measure, risks)

			// Calcular prioridad
			priority := s.calculatePriority(measure, risks, prioritySet)

			candidate := measureCandidate{
				Measure:       measure,
				ShopID:        shopID,
				ShopLocation:  shop.Location,
				RiskReduction: riskReduction,
				Efficiency:    riskReduction / measure.EstimatedCost,
				AffectedRisks: affectedRisks,
				Priority:      priority,
			}
			candidates = append(candidates, candidate)
		}
	}

	return candidates, nil
}

// greedyOptimization implementa optimización greedy
// Algoritmo: Ordena por eficiencia (reducción/costo) y selecciona en orden
// Complejidad: O(n log n)
// Ventaja: Rápido y produce buenos resultados en la mayoría de casos
func (s *optimizationService) greedyOptimization(candidates []measureCandidate, budget float64) []measureCandidate {
	// Ordenar por eficiencia descendente
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Efficiency > candidates[j].Efficiency
	})

	var selected []measureCandidate
	remaining := budget
	selectedMeasuresByShop := make(map[int64]map[string]bool)

	for _, c := range candidates {
		if c.Measure.EstimatedCost > remaining {
			continue
		}

		// Verificar si ya seleccionamos esta medida para esta tienda
		if selectedMeasuresByShop[c.ShopID] == nil {
			selectedMeasuresByShop[c.ShopID] = make(map[string]bool)
		}
		if selectedMeasuresByShop[c.ShopID][c.Measure.Name] {
			continue
		}

		selected = append(selected, c)
		selectedMeasuresByShop[c.ShopID][c.Measure.Name] = true
		remaining -= c.Measure.EstimatedCost

		if remaining <= 0 {
			break
		}
	}

	return selected
}

// knapsackOptimization implementa el problema de la mochila 0/1
// Algoritmo: Programación dinámica para maximizar reducción de riesgo
// Complejidad: O(n * W) donde W es el presupuesto discretizado
// Ventaja: Solución óptima garantizada
func (s *optimizationService) knapsackOptimization(candidates []measureCandidate, budget float64) []measureCandidate {
	n := len(candidates)
	if n == 0 {
		return nil
	}

	// Discretizar el presupuesto (usar centenas para reducir complejidad)
	scale := 100.0
	W := int(budget / scale)

	// dp[i] = máxima reducción de riesgo con presupuesto i
	dp := make([]float64, W+1)
	keep := make([][]bool, n)

	for i := range keep {
		keep[i] = make([]bool, W+1)
	}

	for i := 0; i < n; i++ {
		cost := int(candidates[i].Measure.EstimatedCost / scale)
		value := candidates[i].RiskReduction

		// Iterar de mayor a menor para evitar usar el mismo item múltiples veces
		for w := W; w >= cost; w-- {
			if dp[w-cost]+value > dp[w] {
				dp[w] = dp[w-cost] + value
				keep[i][w] = true
			}
		}
	}

	// Reconstruir solución
	var selected []measureCandidate
	w := W
	selectedMeasuresByShop := make(map[int64]map[string]bool)

	for i := n - 1; i >= 0 && w > 0; i-- {
		if keep[i][w] {
			c := candidates[i]
			// Verificar duplicados
			if selectedMeasuresByShop[c.ShopID] == nil {
				selectedMeasuresByShop[c.ShopID] = make(map[string]bool)
			}
			if !selectedMeasuresByShop[c.ShopID][c.Measure.Name] {
				selected = append(selected, c)
				selectedMeasuresByShop[c.ShopID][c.Measure.Name] = true
			}
			w -= int(c.Measure.EstimatedCost / scale)
		}
	}

	return selected
}

// weightedOptimization considera prioridades de riesgos
// Algoritmo: Greedy modificado con pesos por prioridad
// Ventaja: Permite al usuario enfocarse en riesgos específicos
func (s *optimizationService) weightedOptimization(candidates []measureCandidate, budget float64, priorities []int64) []measureCandidate {
	// Si no hay prioridades, usar greedy normal
	if len(priorities) == 0 {
		return s.greedyOptimization(candidates, budget)
	}

	// Ordenar por prioridad primero, luego por eficiencia
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].Priority != candidates[j].Priority {
			return candidates[i].Priority > candidates[j].Priority
		}
		return candidates[i].Efficiency > candidates[j].Efficiency
	})

	var selected []measureCandidate
	remaining := budget
	selectedMeasuresByShop := make(map[int64]map[string]bool)

	for _, c := range candidates {
		if c.Measure.EstimatedCost > remaining {
			continue
		}

		if selectedMeasuresByShop[c.ShopID] == nil {
			selectedMeasuresByShop[c.ShopID] = make(map[string]bool)
		}
		if selectedMeasuresByShop[c.ShopID][c.Measure.Name] {
			continue
		}

		selected = append(selected, c)
		selectedMeasuresByShop[c.ShopID][c.Measure.Name] = true
		remaining -= c.Measure.EstimatedCost
	}

	return selected
}

// estimateRiskReduction estima la reducción de riesgo de una medida
func (s *optimizationService) estimateRiskReduction(measure models.Measure, risks []models.RiskDetail, currentRisk float64) float64 {
	// Modelo simplificado: La reducción depende del tipo de medida y el riesgo actual
	// En producción, esto vendría de datos históricos o modelos más sofisticados

	baseReduction := 0.0
	switch measure.Type {
	case models.MeasureTypeNatural:
		baseReduction = 0.05 // 5% de reducción base
	case models.MeasureTypeMaterial:
		baseReduction = 0.10 // 10% de reducción base
	case models.MeasureTypeImmaterial:
		baseReduction = 0.03 // 3% de reducción base
	}

	// Ajustar por el riesgo actual (más reducción si el riesgo es alto)
	adjustedReduction := baseReduction * (1 + currentRisk)

	// Considerar el costo-efectividad
	costFactor := 1.0 / (1 + measure.EstimatedCost/10000)

	return adjustedReduction * (1 + costFactor)
}

// getAffectedRisks determina qué riesgos mitiga una medida
func (s *optimizationService) getAffectedRisks(measure models.Measure, risks []models.RiskDetail) []string {
	// Mapeo de tipos de medida a riesgos (simplificado)
	// En producción vendría de la tabla Risk_measures
	var affected []string

	measureName := measure.Name

	// Lógica basada en palabras clave en el nombre de la medida
	riskKeywords := map[string][]string{
		"inundación":    {"Inundación costera/fluvial/pluvial", "Precipitaciones intensas/extremas"},
		"pluvial":       {"Variabilidad hidrológica o de las precipitaciones", "Cambios en los patrones y tipos de precipitaciones"},
		"drenaje":       {"Inundación costera/fluvial/pluvial", "Precipitaciones intensas/extremas"},
		"agua":          {"Inundación costera/fluvial/pluvial", "Variabilidad hidrológica o de las precipitaciones"},
		"calor":         {"Ola de calor", "Estrés térmico"},
		"térmico":       {"Ola de calor", "Estrés térmico", "Variabilidad de la temperatura"},
		"climatización": {"Ola de calor", "Cambios de temperatura"},
		"viento":        {"Tormenta", "Ciclón/Huracán/Tifón"},
		"incendio":      {"Incendio forestal"},
		"estructural":   {"Tormenta", "Hundimiento", "Desprendimento de tierras"},
	}

	for keyword, riskNames := range riskKeywords {
		if containsIgnoreCase(measureName, keyword) {
			affected = append(affected, riskNames...)
		}
	}

	// Eliminar duplicados
	seen := make(map[string]bool)
	var unique []string
	for _, r := range affected {
		if !seen[r] {
			seen[r] = true
			unique = append(unique, r)
		}
	}

	if len(unique) == 0 {
		// Si no hay match, asumir que afecta a todos los riesgos mínimamente
		for _, r := range risks {
			unique = append(unique, r.Name)
		}
	}

	return unique
}

// calculatePriority calcula la prioridad de una medida
func (s *optimizationService) calculatePriority(measure models.Measure, risks []models.RiskDetail, prioritySet map[int64]bool) int {
	priority := 0

	for _, risk := range risks {
		if prioritySet[risk.ID] {
			priority += 10 // Bonus por riesgo prioritario
		}
		// Bonus adicional por riesgo alto
		if risk.RiskScore > 0.7 {
			priority += 5
		}
	}

	// Bonus por tipo de medida
	switch measure.Type {
	case models.MeasureTypeMaterial:
		priority += 3
	case models.MeasureTypeNatural:
		priority += 2
	}

	return priority
}

// buildResult construye el resultado de optimización
func (s *optimizationService) buildResult(selected []measureCandidate, budget float64, strategy string, startTime time.Time) *models.OptimizationResult {
	var totalCost float64
	var totalReduction float64

	// Agrupar por tienda
	shopMeasures := make(map[int64][]measureCandidate)
	for _, c := range selected {
		totalCost += c.Measure.EstimatedCost
		totalReduction += c.RiskReduction
		shopMeasures[c.ShopID] = append(shopMeasures[c.ShopID], c)
	}

	// Construir recomendaciones por medida
	recommendedMeasures := make([]models.RecommendedMeasure, 0, len(selected))
	for i, c := range selected {
		recommendedMeasures = append(recommendedMeasures, models.RecommendedMeasure{
			Measure:        c.Measure,
			Priority:       i + 1,
			RiskReduction:  c.RiskReduction * 100,
			CostEfficiency: c.Efficiency,
			AffectedRisks:  c.AffectedRisks,
			Justification:  generateJustification(c),
		})
	}

	// Construir recomendaciones por tienda
	shopRecommendations := make([]models.ShopRecommendation, 0, len(shopMeasures))
	for shopID, candidates := range shopMeasures {
		var shopCost float64
		var shopReduction float64
		measures := make([]models.RecommendedMeasure, 0, len(candidates))

		for i, c := range candidates {
			shopCost += c.Measure.EstimatedCost
			shopReduction += c.RiskReduction
			measures = append(measures, models.RecommendedMeasure{
				Measure:        c.Measure,
				Priority:       i + 1,
				RiskReduction:  c.RiskReduction * 100,
				CostEfficiency: c.Efficiency,
				AffectedRisks:  c.AffectedRisks,
				Justification:  generateJustification(c),
			})
		}

		shopRecommendations = append(shopRecommendations, models.ShopRecommendation{
			ShopID:              shopID,
			ShopLocation:        candidates[0].ShopLocation,
			CurrentRisk:         0, // Se llenaría con datos reales
			ProjectedRisk:       0,
			Measures:            measures,
			EstimatedInvestment: shopCost,
		})
	}

	// Calcular métricas
	budgetUtilization := 0.0
	if budget > 0 {
		budgetUtilization = (totalCost / budget) * 100
	}

	avgReduction := 0.0
	if len(selected) > 0 {
		avgReduction = totalReduction / float64(len(selected)) * 100
	}

	// ROI estimado (simplificado: reducción de riesgo * factor arbitrario)
	roi := totalReduction * 5 // Asumimos que cada punto de reducción vale 5x la inversión

	return &models.OptimizationResult{
		TotalCost:           totalCost,
		RemainingBudget:     budget - totalCost,
		TotalRiskReduction:  totalReduction * 100,
		RecommendedMeasures: recommendedMeasures,
		ShopRecommendations: shopRecommendations,
		Strategy:            strategy,
		OptimizationMetrics: models.OptimizationMetrics{
			BudgetUtilization:    budgetUtilization,
			AverageRiskReduction: avgReduction,
			ROI:                  roi,
			ProcessingTimeMs:     time.Since(startTime).Milliseconds(),
		},
	}
}

// generateJustification genera una justificación textual para la recomendación
func generateJustification(c measureCandidate) string {
	effLevel := "moderada"
	if c.Efficiency > 0.001 {
		effLevel = "alta"
	} else if c.Efficiency < 0.0001 {
		effLevel = "baja"
	}

	return "Medida con eficiencia " + effLevel + " que reduce riesgos relacionados con " +
		"eventos climáticos. Inversión recomendada para mitigación integral."
}

// containsIgnoreCase verifica si un string contiene otro (case insensitive)
func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr || len(substr) == 0 ||
			(len(s) > 0 && containsIgnoreCaseHelper(s, substr)))
}

func containsIgnoreCaseHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if equalFoldSubstr(s[i:i+len(substr)], substr) {
			return true
		}
	}
	return false
}

func equalFoldSubstr(s1, s2 string) bool {
	if len(s1) != len(s2) {
		return false
	}
	for i := 0; i < len(s1); i++ {
		c1, c2 := s1[i], s2[i]
		if c1 >= 'A' && c1 <= 'Z' {
			c1 += 'a' - 'A'
		}
		if c2 >= 'A' && c2 <= 'Z' {
			c2 += 'a' - 'A'
		}
		if c1 != c2 {
			return false
		}
	}
	return true
}
