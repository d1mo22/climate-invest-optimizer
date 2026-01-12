// Package router configura las rutas de la API.
package router

import (
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/interfaces/http/handlers"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
)

// Config contiene la configuración del router
type Config struct {
	ShopHandler         *handlers.ShopHandler
	ClusterHandler      *handlers.ClusterHandler
	MeasureHandler      *handlers.MeasureHandler
	RiskHandler         *handlers.RiskHandler
	OptimizationHandler *handlers.OptimizationHandler
	DashboardHandler    *handlers.DashboardHandler
	AuthHandler         *handlers.AuthHandler
	HealthHandler       *handlers.HealthHandler
	JWTService          *middleware.JWTService
	AllowedOrigins      []string
}

// Setup configura todas las rutas de la API
func Setup(r *gin.Engine, cfg *Config) {
	// Middlewares globales
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.ContentTypeJSON())

	// Health check (sin autenticación)
	r.GET("/health", cfg.HealthHandler.Check)

	// API v1
	v1 := r.Group("/api/v1")
	{
		// Rate limiting para toda la API
		v1.Use(middleware.RateLimiter(100)) // 100 requests por minuto

		// Rutas públicas (sin autenticación)
		public := v1.Group("")
		{
			// Autenticación
			if cfg.AuthHandler != nil {
				public.POST("/auth/login", cfg.AuthHandler.Login)
				public.POST("/auth/register", cfg.AuthHandler.Register)
				public.POST("/auth/refresh", cfg.AuthHandler.RefreshToken)
			}

			// Health
			public.GET("/health", cfg.HealthHandler.Check)
		}

		// Rutas protegidas (requieren autenticación)
		protected := v1.Group("")
		if cfg.JWTService != nil {
			protected.Use(middleware.AuthMiddleware(cfg.JWTService))
		}
		{
			// ==================== SHOPS ====================
			shops := protected.Group("/shops")
			{
				shops.GET("", cfg.ShopHandler.List)
				shops.GET("/:id", cfg.ShopHandler.GetByID)
				shops.POST("", cfg.ShopHandler.Create)
				shops.PATCH("/:id", cfg.ShopHandler.Update)
				shops.DELETE("/:id", cfg.ShopHandler.Delete)

				// Medidas de una tienda
				shops.GET("/:id/measures", cfg.ShopHandler.GetAppliedMeasures)
				shops.POST("/:id/measures", cfg.ShopHandler.ApplyMeasures)
				// Soportar nombres con '/' (p.ej. "costera/fluvial/pluvial").
				// Nota: Gin no permite coexistir '*measureName' con ':measureName' en el mismo prefijo.
				shops.DELETE("/:id/measures/*measureName", cfg.ShopHandler.RemoveMeasure)

				// Evaluación de riesgos
				shops.GET("/:id/risk-assessment", cfg.ShopHandler.GetRiskAssessment)

				// Cobertura de riesgos
				shops.GET("/:id/risk-coverage", cfg.ShopHandler.GetRiskCoverage)

				// Medidas aplicables
				shops.GET("/:id/applicable-measures", cfg.MeasureHandler.GetApplicableForShop)
			}

			// ==================== CLUSTERS ====================
			clusters := protected.Group("/clusters")
			{
				clusters.GET("", cfg.ClusterHandler.List)
				clusters.GET("/:id", cfg.ClusterHandler.GetByID)

				// Tiendas de un cluster
				clusters.GET("/:clusterId/shops", cfg.ShopHandler.GetByCluster)

				// Riesgos de un cluster
				clusters.GET("/:clusterId/risks", cfg.RiskHandler.GetByCluster)
			}

			// ==================== MEASURES ====================
			measures := protected.Group("/measures")
			{
				measures.GET("", cfg.MeasureHandler.List)
				measures.GET("/:name", cfg.MeasureHandler.GetByName)
			}

			// ==================== RISKS ====================
			risks := protected.Group("/risks")
			{
				risks.GET("", cfg.RiskHandler.List)
				risks.GET("/:id", cfg.RiskHandler.GetByID)
				risks.GET("/:id/measures", cfg.MeasureHandler.GetByRisk)
			}

			// ==================== OPTIMIZATION ====================
			optimization := protected.Group("/optimization")
			{
				optimization.POST("/budget", cfg.OptimizationHandler.OptimizeBudget)
			}

			// ==================== DASHBOARD ====================
			dashboard := protected.Group("/dashboard")
			{
				dashboard.GET("/stats", cfg.DashboardHandler.GetStats)
			}

			// ==================== AUTH (protegidas) ====================
			if cfg.AuthHandler != nil {
				auth := protected.Group("/auth")
				{
					auth.GET("/me", cfg.AuthHandler.GetCurrentUser)
					auth.POST("/logout", cfg.AuthHandler.Logout)
				}
			}
		}

		// Rutas de administrador
		if cfg.JWTService != nil {
			admin := v1.Group("/admin")
			admin.Use(middleware.AuthMiddleware(cfg.JWTService))
			admin.Use(middleware.RequireRole("admin"))
			{
				// Rutas administrativas futuras
				// admin.GET("/users", ...)
				// admin.DELETE("/users/:id", ...)
			}
		}
	}

	// Manejo de rutas no encontradas
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Endpoint no encontrado",
			},
		})
	})

	// Manejo de métodos no permitidos
	r.NoMethod(func(c *gin.Context) {
		c.JSON(405, gin.H{
			"error": gin.H{
				"code":    "METHOD_NOT_ALLOWED",
				"message": "Método HTTP no permitido para este endpoint",
			},
		})
	})
}

// SetupSimple configura rutas sin autenticación (para desarrollo)
func SetupSimple(r *gin.Engine, cfg *Config) {
	// Middlewares globales
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(middleware.ContentTypeJSON())

	// Health check
	r.GET("/health", cfg.HealthHandler.Check)

	// API v1 (sin autenticación)
	v1 := r.Group("/api/v1")
	{
		// Shops
		v1.GET("/shops", cfg.ShopHandler.List)
		v1.GET("/shops/:id", cfg.ShopHandler.GetByID)
		v1.POST("/shops", cfg.ShopHandler.Create)
		v1.PATCH("/shops/:id", cfg.ShopHandler.Update)
		v1.DELETE("/shops/:id", cfg.ShopHandler.Delete)
		v1.GET("/shops/:id/measures", cfg.ShopHandler.GetAppliedMeasures)
		v1.POST("/shops/:id/measures", cfg.ShopHandler.ApplyMeasures)
		// Soportar nombres con '/' (p.ej. "costera/fluvial/pluvial").
		// Nota: Gin no permite coexistir '*measureName' con ':measureName' en el mismo prefijo.
		v1.DELETE("/shops/:id/measures/*measureName", cfg.ShopHandler.RemoveMeasure)
		v1.GET("/shops/:id/risk-assessment", cfg.ShopHandler.GetRiskAssessment)
		v1.GET("/shops/:id/risk-coverage", cfg.ShopHandler.GetRiskCoverage)
		v1.GET("/shops/:id/applicable-measures", cfg.MeasureHandler.GetApplicableForShop)

		// Clusters
		v1.GET("/clusters", cfg.ClusterHandler.List)
		v1.GET("/clusters/:id", cfg.ClusterHandler.GetByID)
		v1.GET("/clusters/:id/shops", cfg.ShopHandler.GetByCluster)
		v1.GET("/clusters/:id/risks", cfg.RiskHandler.GetByCluster)

		// Measures
		v1.GET("/measures", cfg.MeasureHandler.List)
		v1.GET("/measures/:name", cfg.MeasureHandler.GetByName)

		// Risks
		v1.GET("/risks", cfg.RiskHandler.List)
		v1.GET("/risks/:id", cfg.RiskHandler.GetByID)
		v1.GET("/risks/:id/measures", cfg.MeasureHandler.GetByRisk)

		// Optimization
		v1.POST("/optimization/budget", cfg.OptimizationHandler.OptimizeBudget)

		// Dashboard
		v1.GET("/dashboard/stats", cfg.DashboardHandler.GetStats)
	}

	// 404 handler
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Endpoint no encontrado",
			},
		})
	})
}
