// Package optimization_test contiene tests unitarios para los algoritmos de optimización.
package optimization_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/application/services"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
)

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

// mockShopRepository implementa repository.ShopRepository para testing
type mockShopRepository struct {
	shops map[int64]*models.Shop
}

func newMockShopRepo() *mockShopRepository {
	return &mockShopRepository{
		shops: map[int64]*models.Shop{
			1: {ID: 1, Location: "Madrid Centro", ClusterID: 1, TotalRisk: 0.75, Surface: 500},
			2: {ID: 2, Location: "Barcelona Diagonal", ClusterID: 4, TotalRisk: 0.45, Surface: 800},
			3: {ID: 3, Location: "Valencia Puerto", ClusterID: 7, TotalRisk: 0.85, Surface: 350},
			4: {ID: 4, Location: "Sevilla Centro", ClusterID: 2, TotalRisk: 0.60, Surface: 600},
			5: {ID: 5, Location: "Bilbao", ClusterID: 6, TotalRisk: 0.30, Surface: 400},
		},
	}
}

func (m *mockShopRepository) Create(ctx context.Context, shop *models.Shop) error { return nil }
func (m *mockShopRepository) GetByID(ctx context.Context, id int64) (*models.Shop, error) {
	if shop, ok := m.shops[id]; ok {
		return shop, nil
	}
	return nil, models.ErrShopNotFound
}
func (m *mockShopRepository) Update(ctx context.Context, shop *models.Shop) error { return nil }
func (m *mockShopRepository) Delete(ctx context.Context, id int64) error          { return nil }
func (m *mockShopRepository) List(ctx context.Context, filter *models.ShopFilterRequest) ([]models.Shop, int64, error) {
	var result []models.Shop
	for _, shop := range m.shops {
		result = append(result, *shop)
	}
	return result, int64(len(result)), nil
}
func (m *mockShopRepository) GetByClusterID(ctx context.Context, clusterID int64) ([]models.Shop, error) {
	var result []models.Shop
	for _, shop := range m.shops {
		if shop.ClusterID == clusterID {
			result = append(result, *shop)
		}
	}
	return result, nil
}
func (m *mockShopRepository) GetWithDetails(ctx context.Context, id int64) (*models.ShopWithDetails, error) {
	shop, err := m.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &models.ShopWithDetails{Shop: *shop}, nil
}
func (m *mockShopRepository) GetAppliedMeasures(ctx context.Context, shopID int64) ([]models.Measure, error) {
	return []models.Measure{}, nil
}
func (m *mockShopRepository) ApplyMeasure(ctx context.Context, shopID int64, measureName string) error {
	return nil
}
func (m *mockShopRepository) RemoveMeasure(ctx context.Context, shopID int64, measureName string) error {
	return nil
}
func (m *mockShopRepository) GetStats(ctx context.Context) (*models.DashboardStats, error) {
	return &models.DashboardStats{TotalShops: int64(len(m.shops))}, nil
}

// mockMeasureRepository implementa repository.MeasureRepository para testing
type mockMeasureRepository struct {
	measures []models.Measure
}

func newMockMeasureRepo() *mockMeasureRepository {
	return &mockMeasureRepository{
		measures: []models.Measure{
			{Name: "Revisión sistemas pluviales", EstimatedCost: 400, Type: models.MeasureTypeMaterial},
			{Name: "Plan emergencia", EstimatedCost: 800, Type: models.MeasureTypeImmaterial},
			{Name: "Deshumidificador", EstimatedCost: 800, Type: models.MeasureTypeMaterial},
			{Name: "Sistemas alerta", EstimatedCost: 1000, Type: models.MeasureTypeImmaterial},
			{Name: "BMS", EstimatedCost: 1000, Type: models.MeasureTypeMaterial},
			{Name: "Aislamiento térmico", EstimatedCost: 1500, Type: models.MeasureTypeMaterial},
			{Name: "Sectorización incendios", EstimatedCost: 3000, Type: models.MeasureTypeMaterial},
			{Name: "Barreras inundación", EstimatedCost: 4000, Type: models.MeasureTypeMaterial},
			{Name: "Jardín de lluvia", EstimatedCost: 4400, Type: models.MeasureTypeNatural},
			{Name: "Grupo electrógeno", EstimatedCost: 6000, Type: models.MeasureTypeMaterial},
			{Name: "Refuerzo estructural", EstimatedCost: 7000, Type: models.MeasureTypeMaterial},
			{Name: "Impermeabilización", EstimatedCost: 28000, Type: models.MeasureTypeMaterial},
			{Name: "Cubierta vegetal", EstimatedCost: 42000, Type: models.MeasureTypeNatural},
		},
	}
}

func (m *mockMeasureRepository) Create(ctx context.Context, measure *models.Measure) error { return nil }
func (m *mockMeasureRepository) GetByName(ctx context.Context, name string) (*models.Measure, error) {
	for _, measure := range m.measures {
		if measure.Name == name {
			return &measure, nil
		}
	}
	return nil, models.ErrMeasureNotFound
}
func (m *mockMeasureRepository) Update(ctx context.Context, measure *models.Measure) error { return nil }
func (m *mockMeasureRepository) Delete(ctx context.Context, name string) error             { return nil }
func (m *mockMeasureRepository) List(ctx context.Context) ([]models.Measure, error) {
	return m.measures, nil
}
func (m *mockMeasureRepository) GetByType(ctx context.Context, measureType models.MeasureType) ([]models.Measure, error) {
	var result []models.Measure
	for _, measure := range m.measures {
		if measure.Type == measureType {
			result = append(result, measure)
		}
	}
	return result, nil
}
func (m *mockMeasureRepository) GetByRisk(ctx context.Context, riskName string) ([]models.Measure, error) {
	return m.measures[:5], nil // Return first 5 measures for any risk
}
func (m *mockMeasureRepository) GetApplicableForShop(ctx context.Context, shopID int64) ([]models.Measure, error) {
	return m.measures, nil
}

// mockRiskRepository implementa repository.RiskRepository para testing
type mockRiskRepository struct {
	risks       []models.Risk
	riskDetails []models.RiskDetail
}

func newMockRiskRepo() *mockRiskRepository {
	risks := []models.Risk{
		{ID: 1, Name: "Inundación costera/fluvial/pluvial"},
		{ID: 2, Name: "Ola de calor"},
		{ID: 3, Name: "Estrés térmico"},
		{ID: 4, Name: "Incendio forestal"},
		{ID: 5, Name: "Viento extremo"},
		{ID: 6, Name: "Sequía"},
		{ID: 7, Name: "Granizo"},
	}

	riskDetails := make([]models.RiskDetail, len(risks))
	for i, r := range risks {
		riskDetails[i] = models.RiskDetail{
			Risk:     r,
			Exposure: models.LevelMedium,
		}
	}

	return &mockRiskRepository{
		risks:       risks,
		riskDetails: riskDetails,
	}
}

func (m *mockRiskRepository) Create(ctx context.Context, risk *models.Risk) error { return nil }
func (m *mockRiskRepository) GetByID(ctx context.Context, id int64) (*models.Risk, error) {
	for _, risk := range m.risks {
		if risk.ID == id {
			return &risk, nil
		}
	}
	return nil, models.ErrRiskNotFound
}
func (m *mockRiskRepository) GetByName(ctx context.Context, name string) (*models.Risk, error) {
	for _, risk := range m.risks {
		if risk.Name == name {
			return &risk, nil
		}
	}
	return nil, models.ErrRiskNotFound
}
func (m *mockRiskRepository) List(ctx context.Context) ([]models.Risk, error) {
	return m.risks, nil
}
func (m *mockRiskRepository) GetByClusterID(ctx context.Context, clusterID int64) ([]models.RiskDetail, error) {
	return m.riskDetails, nil
}

// ============================================================================
// TEST HELPERS
// ============================================================================

func createTestService() services.OptimizationService {
	return services.NewOptimizationService(
		newMockShopRepo(),
		newMockMeasureRepo(),
		newMockRiskRepo(),
	)
}

// ============================================================================
// GREEDY ALGORITHM TESTS
// ============================================================================

func TestGreedy_SingleShop_SmallBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 3000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 3000 {
		t.Errorf("TotalCost=%v excede presupuesto 3000", result.TotalCost)
	}

	if len(result.RecommendedMeasures) == 0 {
		t.Error("Se esperaban medidas recomendadas")
	}

	t.Logf("✓ Greedy SmallBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestGreedy_SingleShop_MediumBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 10000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 10000 {
		t.Errorf("TotalCost=%v excede presupuesto 10000", result.TotalCost)
	}

	// Con €10,000 deberíamos poder incluir varias medidas
	if len(result.RecommendedMeasures) < 3 {
		t.Errorf("Se esperaban al menos 3 medidas, got %d", len(result.RecommendedMeasures))
	}

	t.Logf("✓ Greedy MediumBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestGreedy_SingleShop_LargeBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 100000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 100000 {
		t.Errorf("TotalCost=%v excede presupuesto 100000", result.TotalCost)
	}

	t.Logf("✓ Greedy LargeBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestGreedy_MultipleShops(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1, 2, 3},
		MaxBudget: 25000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 25000 {
		t.Errorf("TotalCost=%v excede presupuesto 25000", result.TotalCost)
	}

	// Verificar que hay recomendaciones para las tiendas
	if len(result.ShopRecommendations) == 0 {
		t.Error("Se esperaban recomendaciones por tienda")
	}

	t.Logf("✓ Greedy MultipleShops: Coste=€%.0f, Medidas=%d, Tiendas=%d",
		result.TotalCost, len(result.RecommendedMeasures), len(result.ShopRecommendations))
}

func TestGreedy_AllShops(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1, 2, 3, 4, 5},
		MaxBudget: 50000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 50000 {
		t.Errorf("TotalCost=%v excede presupuesto 50000", result.TotalCost)
	}

	t.Logf("✓ Greedy AllShops: Coste=€%.0f, Medidas=%d, Tiendas=%d",
		result.TotalCost, len(result.RecommendedMeasures), len(result.ShopRecommendations))
}

// ============================================================================
// KNAPSACK ALGORITHM TESTS
// ============================================================================

func TestKnapsack_SingleShop_SmallBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 5000,
		Strategy:  "knapsack",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 5000 {
		t.Errorf("TotalCost=%v excede presupuesto 5000", result.TotalCost)
	}

	t.Logf("✓ Knapsack SmallBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestKnapsack_SingleShop_MediumBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 15000,
		Strategy:  "knapsack",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 15000 {
		t.Errorf("TotalCost=%v excede presupuesto 15000", result.TotalCost)
	}

	t.Logf("✓ Knapsack MediumBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestKnapsack_MultipleShops(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1, 2, 3},
		MaxBudget: 30000,
		Strategy:  "knapsack",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 30000 {
		t.Errorf("TotalCost=%v excede presupuesto 30000", result.TotalCost)
	}

	t.Logf("✓ Knapsack MultipleShops: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

// ============================================================================
// WEIGHTED ALGORITHM TESTS
// ============================================================================

func TestWeighted_WithPriorities(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:    []int64{1},
		MaxBudget:  20000,
		Strategy:   "weighted",
		Priorities: []int64{1, 2}, // Priorizar inundación y ola de calor
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 20000 {
		t.Errorf("TotalCost=%v excede presupuesto 20000", result.TotalCost)
	}

	t.Logf("✓ Weighted WithPriorities: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestWeighted_NoPriorities(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 15000,
		Strategy:  "weighted",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 15000 {
		t.Errorf("TotalCost=%v excede presupuesto 15000", result.TotalCost)
	}

	t.Logf("✓ Weighted NoPriorities: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestWeighted_MultipleShops_WithPriorities(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:    []int64{1, 3, 5},
		MaxBudget:  40000,
		Strategy:   "weighted",
		Priorities: []int64{1}, // Priorizar solo inundación
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 40000 {
		t.Errorf("TotalCost=%v excede presupuesto 40000", result.TotalCost)
	}

	t.Logf("✓ Weighted MultiShops+Priorities: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

func TestEdgeCase_ShopNotFound(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	_, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{999},
		MaxBudget: 10000,
		Strategy:  "greedy",
	})

	if err == nil {
		t.Error("Se esperaba error para tienda inexistente")
	} else {
		t.Logf("✓ Error esperado: %v", err)
	}
}

func TestEdgeCase_MinimumBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	// Presupuesto exacto para la medida más barata (€400)
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 400,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 400 {
		t.Errorf("TotalCost=%v excede presupuesto 400", result.TotalCost)
	}

	if len(result.RecommendedMeasures) != 1 {
		t.Errorf("Se esperaba exactamente 1 medida, got %d", len(result.RecommendedMeasures))
	}

	t.Logf("✓ MinimumBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestEdgeCase_InsufficientBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	// Presupuesto insuficiente para cualquier medida (€100, mínima cuesta €400)
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 100,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if len(result.RecommendedMeasures) != 0 {
		t.Errorf("Se esperaban 0 medidas con presupuesto insuficiente, got %d", len(result.RecommendedMeasures))
	}

	t.Logf("✓ InsufficientBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestEdgeCase_VeryLargeBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	// Presupuesto muy grande (€10 millones)
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 10000000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	// Debería incluir todas las medidas disponibles
	t.Logf("✓ VeryLargeBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

func TestEdgeCase_DefaultStrategy(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	// Sin especificar estrategia - debe usar default (greedy)
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 10000,
		Strategy:  "",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	t.Logf("✓ DefaultStrategy: Coste=€%.0f, Medidas=%d, Strategy=%s",
		result.TotalCost, len(result.RecommendedMeasures), result.Strategy)
}

func TestEdgeCase_SingleMeasureBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	// Presupuesto para exactamente una medida específica
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 850, // Entre €800 (deshumidificador) y €1000 (BMS)
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if result.TotalCost > 850 {
		t.Errorf("TotalCost=%v excede presupuesto 850", result.TotalCost)
	}

	t.Logf("✓ SingleMeasureBudget: Coste=€%.0f, Medidas=%d", result.TotalCost, len(result.RecommendedMeasures))
}

// ============================================================================
// ALGORITHM COMPARISON TESTS
// ============================================================================

func TestCompareAlgorithms_SameBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	budgets := []float64{5000, 15000, 30000}
	strategies := []string{"greedy", "knapsack", "weighted"}

	for _, budget := range budgets {
		t.Run(fmt.Sprintf("Budget_%.0f", budget), func(t *testing.T) {
			results := make(map[string]*models.OptimizationResult)

			for _, strategy := range strategies {
				result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
					ShopIDs:   []int64{1},
					MaxBudget: budget,
					Strategy:  strategy,
				})

				if err != nil {
					t.Errorf("Error con %s: %v", strategy, err)
					continue
				}

				results[strategy] = result

				// Verificar que ninguno excede el presupuesto
				if result.TotalCost > budget {
					t.Errorf("%s excede presupuesto: %.0f > %.0f", strategy, result.TotalCost, budget)
				}
			}

			// Log comparación
			t.Logf("\n📊 Comparación €%.0f:", budget)
			for _, s := range strategies {
				if r, ok := results[s]; ok {
					t.Logf("  %s: €%.0f, %d medidas", s, r.TotalCost, len(r.RecommendedMeasures))
				}
			}
		})
	}
}

func TestCompareAlgorithms_Efficiency(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	budget := 20000.0
	strategies := []string{"greedy", "knapsack", "weighted"}

	for _, strategy := range strategies {
		result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
			ShopIDs:   []int64{1, 2},
			MaxBudget: budget,
			Strategy:  strategy,
		})

		if err != nil {
			t.Fatalf("Error con %s: %v", strategy, err)
		}

		// Calcular eficiencia (reducción de riesgo por euro gastado)
		if result.TotalCost > 0 {
			efficiency := result.TotalRiskReduction / result.TotalCost
			t.Logf("✓ %s: Eficiencia=%.4f (reducción/€)", strategy, efficiency)
		}
	}
}

// ============================================================================
// BUDGET UTILIZATION TESTS
// ============================================================================

func TestBudgetUtilization_HighUtilization(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	// Probar que se utiliza la mayor parte del presupuesto
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 10000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	utilization := (result.TotalCost / 10000) * 100
	if utilization < 80 {
		t.Logf("⚠️  Utilización baja: %.1f%%", utilization)
	} else {
		t.Logf("✓ Buena utilización: %.1f%%", utilization)
	}
}

func TestBudgetUtilization_RemainingBudget(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	budget := 15000.0
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: budget,
		Strategy:  "knapsack",
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	remaining := result.RemainingBudget
	if remaining < 0 {
		t.Errorf("RemainingBudget negativo: %.0f", remaining)
	}

	if result.TotalCost+remaining != budget {
		t.Errorf("TotalCost (%.0f) + RemainingBudget (%.0f) != Budget (%.0f)",
			result.TotalCost, remaining, budget)
	}

	t.Logf("✓ Budget: €%.0f = Usado €%.0f + Restante €%.0f", budget, result.TotalCost, remaining)
}

// ============================================================================
// MULTI-SHOP DISTRIBUTION TESTS
// ============================================================================

func TestMultiShop_EqualDistribution(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1, 2, 3},
		MaxBudget: 30000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error: %v", err)
	}

	t.Logf("Distribución por tienda:")
	for _, rec := range result.ShopRecommendations {
		t.Logf("  Shop %d: %d medidas, €%.0f", rec.ShopID, len(rec.Measures), rec.EstimatedInvestment)
	}
}

func TestMultiShop_RiskBasedDistribution(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	// Tienda 3 (Valencia) tiene riesgo 0.85, Tienda 5 (Bilbao) tiene 0.30
	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{3, 5},
		MaxBudget: 20000,
		Strategy:  "weighted",
	})

	if err != nil {
		t.Fatalf("Error: %v", err)
	}

	t.Logf("Distribución basada en riesgo:")
	for _, rec := range result.ShopRecommendations {
		t.Logf("  Shop %d: %d medidas, €%.0f", rec.ShopID, len(rec.Measures), rec.EstimatedInvestment)
	}
}

// ============================================================================
// PERFORMANCE/METRICS TESTS
// ============================================================================

func TestMetrics_ProcessingTime(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1, 2, 3, 4, 5},
		MaxBudget: 100000,
		Strategy:  "knapsack",
	})

	if err != nil {
		t.Fatalf("Error: %v", err)
	}

	// El procesamiento debería ser rápido (< 1 segundo)
	if result.OptimizationMetrics.ProcessingTimeMs > 1000 {
		t.Errorf("ProcessingTime=%dms excede 1000ms", result.OptimizationMetrics.ProcessingTimeMs)
	}

	t.Logf("✓ ProcessingTime: %dms", result.OptimizationMetrics.ProcessingTimeMs)
}

func TestMetrics_ROI(t *testing.T) {
	service := createTestService()
	ctx := context.Background()

	result, err := service.OptimizeBudget(ctx, &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 15000,
		Strategy:  "greedy",
	})

	if err != nil {
		t.Fatalf("Error: %v", err)
	}

	// ROI debería ser positivo
	if result.OptimizationMetrics.ROI < 0 {
		t.Errorf("ROI negativo: %.2f", result.OptimizationMetrics.ROI)
	}

	t.Logf("✓ EstimatedROI: %.2f", result.OptimizationMetrics.ROI)
}

// ============================================================================
// BENCHMARKS
// ============================================================================

func BenchmarkGreedy_SingleShop(b *testing.B) {
	service := createTestService()
	ctx := context.Background()
	req := &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 20000,
		Strategy:  "greedy",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.OptimizeBudget(ctx, req)
	}
}

func BenchmarkGreedy_MultipleShops(b *testing.B) {
	service := createTestService()
	ctx := context.Background()
	req := &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1, 2, 3, 4, 5},
		MaxBudget: 50000,
		Strategy:  "greedy",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.OptimizeBudget(ctx, req)
	}
}

func BenchmarkKnapsack_SingleShop(b *testing.B) {
	service := createTestService()
	ctx := context.Background()
	req := &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1},
		MaxBudget: 20000,
		Strategy:  "knapsack",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.OptimizeBudget(ctx, req)
	}
}

func BenchmarkKnapsack_MultipleShops(b *testing.B) {
	service := createTestService()
	ctx := context.Background()
	req := &models.OptimizeBudgetRequest{
		ShopIDs:   []int64{1, 2, 3, 4, 5},
		MaxBudget: 50000,
		Strategy:  "knapsack",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.OptimizeBudget(ctx, req)
	}
}

func BenchmarkWeighted_SingleShop(b *testing.B) {
	service := createTestService()
	ctx := context.Background()
	req := &models.OptimizeBudgetRequest{
		ShopIDs:    []int64{1},
		MaxBudget:  20000,
		Strategy:   "weighted",
		Priorities: []int64{1, 2},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.OptimizeBudget(ctx, req)
	}
}

func BenchmarkWeighted_MultipleShops(b *testing.B) {
	service := createTestService()
	ctx := context.Background()
	req := &models.OptimizeBudgetRequest{
		ShopIDs:    []int64{1, 2, 3, 4, 5},
		MaxBudget:  50000,
		Strategy:   "weighted",
		Priorities: []int64{1, 2, 3},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.OptimizeBudget(ctx, req)
	}
}
