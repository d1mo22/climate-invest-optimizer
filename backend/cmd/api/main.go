// Climate Invest Optimizer API
// API REST para optimización de presupuestos de inmuebles
// orientada a prevención y mitigación de riesgos climáticos.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/application/services"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/config"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/infrastructure/persistence/postgres"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/interfaces/http/handlers"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/interfaces/http/middleware"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/interfaces/http/router"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Cargar configuración
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Configurar modo de Gin según entorno
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	// Inicializar conexión a base de datos
	db, err := postgres.NewConnection(postgres.Config{
		URL:             cfg.Database.URL,
		MaxOpenConns:    cfg.Database.MaxOpenConns,
		MaxIdleConns:    cfg.Database.MaxIdleConns,
		ConnMaxLifetime: cfg.Database.ConnMaxLifetime,
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer postgres.Close(db)

	log.Println("✅ Database connection established")

	// Inicializar repositorios
	shopRepo := postgres.NewShopRepository(db)
	clusterRepo := postgres.NewClusterRepository(db)
	measureRepo := postgres.NewMeasureRepository(db)
	riskRepo := postgres.NewRiskRepository(db)

	// Inicializar servicios
	shopService := services.NewShopService(shopRepo, clusterRepo, riskRepo, measureRepo)
	clusterService := services.NewClusterService(clusterRepo)
	measureService := services.NewMeasureService(measureRepo, shopRepo)
	riskService := services.NewRiskService(riskRepo, clusterRepo)
	optimizationService := services.NewOptimizationService(shopRepo, measureRepo, riskRepo)
	dashboardService := services.NewDashboardService(shopRepo)

	// Inicializar servicio JWT
	jwtService := middleware.NewJWTService(middleware.JWTConfig{
		SecretKey:     cfg.JWT.SecretKey,
		TokenExpiry:   cfg.JWT.TokenExpiry,
		RefreshExpiry: cfg.JWT.RefreshExpiry,
		Issuer:        cfg.JWT.Issuer,
	})

	// Inicializar handlers
	shopHandler := handlers.NewShopHandler(shopService)
	clusterHandler := handlers.NewClusterHandler(clusterService)
	measureHandler := handlers.NewMeasureHandler(measureService)
	riskHandler := handlers.NewRiskHandler(riskService)
	optimizationHandler := handlers.NewOptimizationHandler(optimizationService)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService)
	healthHandler := handlers.NewHealthHandler()

	// Crear router
	r := gin.New()

	// Configurar router según entorno
	routerConfig := &router.Config{
		ShopHandler:         shopHandler,
		ClusterHandler:      clusterHandler,
		MeasureHandler:      measureHandler,
		RiskHandler:         riskHandler,
		OptimizationHandler: optimizationHandler,
		DashboardHandler:    dashboardHandler,
		HealthHandler:       healthHandler,
		AllowedOrigins:      cfg.Server.AllowedOrigins,
	}

	// En desarrollo, usar router simple sin autenticación
	if cfg.IsDevelopment() {
		log.Println("⚠️  Running in DEVELOPMENT mode - authentication disabled")
		router.SetupSimple(r, routerConfig)
	} else {
		routerConfig.JWTService = jwtService
		router.Setup(r, routerConfig)
	}

	// Crear servidor HTTP
	srv := &http.Server{
		Addr:         cfg.Server.Host + ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Canal para señales de shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Iniciar servidor en goroutine
	go func() {
		log.Printf("🚀 Server starting on http://%s:%s", cfg.Server.Host, cfg.Server.Port)
		log.Printf("📚 API Documentation: http://localhost:%s/api/v1/health", cfg.Server.Port)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Esperar señal de shutdown
	<-quit
	log.Println("🛑 Shutting down server...")

	// Contexto con timeout para shutdown graceful
	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	// Shutdown graceful
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server exited gracefully")
}

// printBanner imprime el banner de inicio
func init() {
	banner := `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌍 Climate Invest Optimizer API                             ║
║   ─────────────────────────────────────────────────────────   ║
║   Optimización de presupuestos para mitigación de riesgos     ║
║   climáticos en inmuebles.                                    ║
║                                                               ║
║   Version: 1.0.0                                              ║
║   Powered by: Go + Gin + PostgreSQL                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`
	log.Println(banner)
}
