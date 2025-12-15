// Package services_test contiene tests unitarios para los servicios de negocio.
package services_test

import (
	"context"
	"testing"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/application/services"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
)

// ============================================================================
// MOCK REPOSITORIES PARA SHOP SERVICE
// ============================================================================

type mockShopRepoForService struct {
	shops      map[int64]*models.Shop
	nextID     int64
	lastFilter *models.ShopFilterRequest
}

func newMockShopRepoForService() *mockShopRepoForService {
	return &mockShopRepoForService{
		shops: map[int64]*models.Shop{
			1: {ID: 1, Location: "Madrid Centro", ClusterID: 1, TotalRisk: 0.75, Surface: 500},
			2: {ID: 2, Location: "Barcelona", ClusterID: 2, TotalRisk: 0.45, Surface: 800},
		},
		nextID: 3,
	}
}

func (m *mockShopRepoForService) Create(ctx context.Context, shop *models.Shop) error {
	shop.ID = m.nextID
	m.shops[m.nextID] = shop
	m.nextID++
	return nil
}

func (m *mockShopRepoForService) GetByID(ctx context.Context, id int64) (*models.Shop, error) {
	if shop, ok := m.shops[id]; ok {
		return shop, nil
	}
	return nil, models.ErrShopNotFound
}

func (m *mockShopRepoForService) Update(ctx context.Context, shop *models.Shop) error {
	if _, ok := m.shops[shop.ID]; !ok {
		return models.ErrShopNotFound
	}
	m.shops[shop.ID] = shop
	return nil
}

func (m *mockShopRepoForService) Delete(ctx context.Context, id int64) error {
	if _, ok := m.shops[id]; !ok {
		return models.ErrShopNotFound
	}
	delete(m.shops, id)
	return nil
}

func (m *mockShopRepoForService) List(ctx context.Context, filter *models.ShopFilterRequest) ([]models.Shop, int64, error) {
	m.lastFilter = filter
	var result []models.Shop
	for _, shop := range m.shops {
		result = append(result, *shop)
	}
	return result, int64(len(result)), nil
}

func (m *mockShopRepoForService) GetByClusterID(ctx context.Context, clusterID int64) ([]models.Shop, error) {
	var result []models.Shop
	for _, shop := range m.shops {
		if shop.ClusterID == clusterID {
			result = append(result, *shop)
		}
	}
	return result, nil
}

func (m *mockShopRepoForService) GetWithDetails(ctx context.Context, id int64) (*models.ShopWithDetails, error) {
	shop, err := m.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &models.ShopWithDetails{Shop: *shop}, nil
}

func (m *mockShopRepoForService) GetAppliedMeasures(ctx context.Context, shopID int64) ([]models.Measure, error) {
	return []models.Measure{}, nil
}

func (m *mockShopRepoForService) ApplyMeasure(ctx context.Context, shopID int64, measureName string) error {
	return nil
}

func (m *mockShopRepoForService) RemoveMeasure(ctx context.Context, shopID int64, measureName string) error {
	return nil
}

func (m *mockShopRepoForService) GetStats(ctx context.Context) (*models.DashboardStats, error) {
	return &models.DashboardStats{TotalShops: int64(len(m.shops))}, nil
}

// mockClusterRepo para ShopService
type mockClusterRepoForService struct {
	clusters map[int64]*models.Cluster
}

func newMockClusterRepoForService() *mockClusterRepoForService {
	return &mockClusterRepoForService{
		clusters: map[int64]*models.Cluster{
			1: {ID: 1, Name: "Centro Urbano"},
			2: {ID: 2, Name: "Costa Mediterránea"},
			3: {ID: 3, Name: "Montaña"},
		},
	}
}

func (m *mockClusterRepoForService) Create(ctx context.Context, cluster *models.Cluster) error {
	return nil
}

func (m *mockClusterRepoForService) GetByID(ctx context.Context, id int64) (*models.Cluster, error) {
	if cluster, ok := m.clusters[id]; ok {
		return cluster, nil
	}
	return nil, models.ErrClusterNotFound
}

func (m *mockClusterRepoForService) Update(ctx context.Context, cluster *models.Cluster) error {
	return nil
}

func (m *mockClusterRepoForService) Delete(ctx context.Context, id int64) error {
	return nil
}

func (m *mockClusterRepoForService) List(ctx context.Context) ([]models.Cluster, error) {
	var result []models.Cluster
	for _, c := range m.clusters {
		result = append(result, *c)
	}
	return result, nil
}

func (m *mockClusterRepoForService) GetWithRisks(ctx context.Context, id int64) (*models.ClusterWithRisks, error) {
	if cluster, ok := m.clusters[id]; ok {
		return &models.ClusterWithRisks{Cluster: *cluster}, nil
	}
	return nil, models.ErrClusterNotFound
}

// mockRiskRepo para ShopService
type mockRiskRepoForService struct {
	risks []models.Risk
}

func newMockRiskRepoForService() *mockRiskRepoForService {
	return &mockRiskRepoForService{
		risks: []models.Risk{
			{ID: 1, Name: "Inundación"},
			{ID: 2, Name: "Ola de calor"},
		},
	}
}

func (m *mockRiskRepoForService) Create(ctx context.Context, risk *models.Risk) error { return nil }
func (m *mockRiskRepoForService) GetByID(ctx context.Context, id int64) (*models.Risk, error) {
	for _, r := range m.risks {
		if r.ID == id {
			return &r, nil
		}
	}
	return nil, models.ErrRiskNotFound
}
func (m *mockRiskRepoForService) GetByName(ctx context.Context, name string) (*models.Risk, error) {
	for _, r := range m.risks {
		if r.Name == name {
			return &r, nil
		}
	}
	return nil, models.ErrRiskNotFound
}
func (m *mockRiskRepoForService) List(ctx context.Context) ([]models.Risk, error) {
	return m.risks, nil
}
func (m *mockRiskRepoForService) GetByClusterID(ctx context.Context, clusterID int64) ([]models.RiskDetail, error) {
	return []models.RiskDetail{
		{Risk: m.risks[0], Exposure: models.LevelMedium},
		{Risk: m.risks[1], Exposure: models.LevelHigh},
	}, nil
}

// mockMeasureRepo para ShopService
type mockMeasureRepoForService struct {
	measures []models.Measure
}

func newMockMeasureRepoForService() *mockMeasureRepoForService {
	return &mockMeasureRepoForService{
		measures: []models.Measure{
			{Name: "Revisión sistemas pluviales", EstimatedCost: 400},
			{Name: "Aislamiento térmico", EstimatedCost: 1500},
		},
	}
}

func (m *mockMeasureRepoForService) Create(ctx context.Context, measure *models.Measure) error {
	return nil
}
func (m *mockMeasureRepoForService) GetByName(ctx context.Context, name string) (*models.Measure, error) {
	for _, measure := range m.measures {
		if measure.Name == name {
			return &measure, nil
		}
	}
	return nil, models.ErrMeasureNotFound
}
func (m *mockMeasureRepoForService) Update(ctx context.Context, measure *models.Measure) error {
	return nil
}
func (m *mockMeasureRepoForService) Delete(ctx context.Context, name string) error { return nil }
func (m *mockMeasureRepoForService) List(ctx context.Context) ([]models.Measure, error) {
	return m.measures, nil
}
func (m *mockMeasureRepoForService) GetByType(ctx context.Context, measureType models.MeasureType) ([]models.Measure, error) {
	return m.measures, nil
}
func (m *mockMeasureRepoForService) GetByRisk(ctx context.Context, riskName string) ([]models.Measure, error) {
	return m.measures, nil
}
func (m *mockMeasureRepoForService) GetApplicableForShop(ctx context.Context, shopID int64) ([]models.Measure, error) {
	return m.measures, nil
}

// ============================================================================
// HELPER
// ============================================================================

func createShopService() services.ShopService {
	return services.NewShopService(
		newMockShopRepoForService(),
		newMockClusterRepoForService(),
		newMockRiskRepoForService(),
		newMockMeasureRepoForService(),
	)
}

// ============================================================================
// SHOP SERVICE TESTS
// ============================================================================

func TestShopService_Create_Success(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	req := &models.CreateShopRequest{
		Location:        "Valencia Centro",
		CoordinateX:     39.47,
		CoordinateY:     -0.37,
		Surface:         600,
		CarbonFootprint: 120.5,
		ClusterID:       1,
	}

	shop, err := service.Create(ctx, req)
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if shop.ID == 0 {
		t.Error("Shop ID debería ser asignado")
	}

	if shop.Location != req.Location {
		t.Errorf("Location esperado %s, got %s", req.Location, shop.Location)
	}

	if shop.Surface != req.Surface {
		t.Errorf("Surface esperado %.0f, got %.0f", req.Surface, shop.Surface)
	}

	t.Logf("✓ Create: Shop ID=%d, Location=%s", shop.ID, shop.Location)
}

func TestShopService_Create_InvalidCluster(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	req := &models.CreateShopRequest{
		Location:    "Test",
		CoordinateX: 40.0,
		CoordinateY: -3.0,
		Surface:     100,
		ClusterID:   999, // Cluster inexistente
	}

	_, err := service.Create(ctx, req)
	if err == nil {
		t.Error("Se esperaba error para cluster inexistente")
	}

	t.Logf("✓ Error esperado: %v", err)
}

func TestShopService_GetByID_Success(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	shop, err := service.GetByID(ctx, 1)
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if shop.ID != 1 {
		t.Errorf("Shop ID esperado 1, got %d", shop.ID)
	}

	if shop.Location != "Madrid Centro" {
		t.Errorf("Location esperado 'Madrid Centro', got '%s'", shop.Location)
	}

	t.Logf("✓ GetByID: Shop=%s, Risk=%.2f", shop.Location, shop.TotalRisk)
}

func TestShopService_GetByID_NotFound(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	_, err := service.GetByID(ctx, 999)
	if err == nil {
		t.Error("Se esperaba error para tienda inexistente")
	}

	t.Logf("✓ Error esperado: %v", err)
}

func TestShopService_List_All(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	result, err := service.List(ctx, &models.ShopFilterRequest{
		PaginationRequest: models.PaginationRequest{
			Page:     1,
			PageSize: 10,
		},
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if len(result.Items) == 0 {
		t.Error("Se esperaban resultados")
	}

	t.Logf("✓ List: %d tiendas, total=%d", len(result.Items), result.Pagination.TotalItems)
}

func TestShopService_List_WithPagination(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	result, err := service.List(ctx, &models.ShopFilterRequest{
		PaginationRequest: models.PaginationRequest{
			Page:     1,
			PageSize: 1,
		},
	})

	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	t.Logf("✓ Pagination: Page=%d, PageSize=%d, Items=%d",
		result.Pagination.Page, result.Pagination.PageSize, len(result.Items))
}

func TestShopService_GetByCluster_Success(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	shops, err := service.GetByCluster(ctx, 1)
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	for _, shop := range shops {
		if shop.ClusterID != 1 {
			t.Errorf("Shop ClusterID esperado 1, got %d", shop.ClusterID)
		}
	}

	t.Logf("✓ GetByCluster: %d tiendas en cluster 1", len(shops))
}

func TestShopService_ApplyMeasures_Success(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	err := service.ApplyMeasures(ctx, 1, []string{"Revisión sistemas pluviales"})
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	t.Log("✓ ApplyMeasures: Medida aplicada correctamente")
}

func TestShopService_ApplyMeasures_ShopNotFound(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	err := service.ApplyMeasures(ctx, 999, []string{"Revisión sistemas pluviales"})
	if err == nil {
		t.Error("Se esperaba error para tienda inexistente")
	}

	t.Logf("✓ Error esperado: %v", err)
}

func TestShopService_RemoveMeasure_Success(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	err := service.RemoveMeasure(ctx, 1, "Revisión sistemas pluviales")
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	t.Log("✓ RemoveMeasure: Medida eliminada correctamente")
}

func TestShopService_GetRiskAssessment_Success(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	assessment, err := service.GetRiskAssessment(ctx, 1)
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if assessment.ShopID != 1 {
		t.Errorf("ShopID esperado 1, got %d", assessment.ShopID)
	}

	t.Logf("✓ RiskAssessment: ShopID=%d, RiskScore=%.2f, RiskLevel=%s",
		assessment.ShopID, assessment.OverallRiskScore, assessment.RiskLevel)
}

func TestShopService_GetRiskAssessment_ShopNotFound(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	_, err := service.GetRiskAssessment(ctx, 999)
	if err == nil {
		t.Error("Se esperaba error para tienda inexistente")
	}

	t.Logf("✓ Error esperado: %v", err)
}

// ============================================================================
// UPDATE TESTS
// ============================================================================

func TestShopService_Update_Success(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	newLocation := "Madrid Actualizado"
	newSurface := float64(750)
	req := &models.UpdateShopRequest{
		Location: &newLocation,
		Surface:  &newSurface,
	}

	shop, err := service.Update(ctx, 1, req)
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	if shop.Location != newLocation {
		t.Errorf("Location esperado '%s', got '%s'", newLocation, shop.Location)
	}

	t.Logf("✓ Update: Shop Location=%s, Surface=%.0f", shop.Location, shop.Surface)
}

func TestShopService_Update_NotFound(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	newLocation := "Test"
	req := &models.UpdateShopRequest{
		Location: &newLocation,
	}

	_, err := service.Update(ctx, 999, req)
	if err == nil {
		t.Error("Se esperaba error para tienda inexistente")
	}

	t.Logf("✓ Error esperado: %v", err)
}

func TestShopService_Delete_Success(t *testing.T) {
	svc := services.NewShopService(
		newMockShopRepoForService(),
		newMockClusterRepoForService(),
		newMockRiskRepoForService(),
		newMockMeasureRepoForService(),
	)
	ctx := context.Background()

	err := svc.Delete(ctx, 1)
	if err != nil {
		t.Fatalf("Error inesperado: %v", err)
	}

	// Verificar que ya no existe
	_, err = svc.GetByID(ctx, 1)
	if err == nil {
		t.Error("La tienda debería haber sido eliminada")
	}

	t.Log("✓ Delete: Tienda eliminada correctamente")
}

func TestShopService_Delete_NotFound(t *testing.T) {
	service := createShopService()
	ctx := context.Background()

	err := service.Delete(ctx, 999)
	if err == nil {
		t.Error("Se esperaba error para tienda inexistente")
	}

	t.Logf("✓ Error esperado: %v", err)
}

// ============================================================================
// BENCHMARKS
// ============================================================================

func BenchmarkShopService_List(b *testing.B) {
	service := createShopService()
	ctx := context.Background()
	filter := &models.ShopFilterRequest{
		PaginationRequest: models.PaginationRequest{
			Page:     1,
			PageSize: 10,
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.List(ctx, filter)
	}
}

func BenchmarkShopService_GetByID(b *testing.B) {
	service := createShopService()
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.GetByID(ctx, 1)
	}
}

func BenchmarkShopService_Create(b *testing.B) {
	ctx := context.Background()
	req := &models.CreateShopRequest{
		Location:    "Test Location",
		CoordinateX: 40.0,
		CoordinateY: -3.0,
		Surface:     500,
		ClusterID:   1,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Crear nuevo servicio para evitar conflictos de ID
		svc := createShopService()
		_, _ = svc.Create(ctx, req)
	}
}
