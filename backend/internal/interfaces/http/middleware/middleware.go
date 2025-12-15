// Package middleware contiene los middlewares HTTP de la aplicación.
package middleware

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/gin-gonic/gin"
)

// CORS configura los headers CORS para permitir acceso desde el frontend
func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Verificar si el origen está permitido
		allowed := false
		for _, o := range allowedOrigins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
		c.Header("Access-Control-Expose-Headers", "X-Request-ID, X-Total-Count")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		// Manejar preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// RequestID añade un ID único a cada petición para trazabilidad
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// Logger middleware para logging de peticiones
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method
		requestID, _ := c.Get("request_id")

		// Formato de log estructurado
		log.Printf("[API] %s | %3d | %13v | %15s | %-7s %s%s | %v",
			time.Now().Format("2006/01/02 - 15:04:05"),
			status,
			latency,
			clientIP,
			method,
			path,
			func() string {
				if query != "" {
					return "?" + query
				}
				return ""
			}(),
			requestID,
		)

		// Log adicional para errores
		if status >= 400 {
			if len(c.Errors) > 0 {
				log.Printf("[ERROR] %s | %v", requestID, c.Errors.String())
			}
		}
	}
}

// RateLimiter implementa un rate limiter básico por IP
func RateLimiter(requestsPerMinute int) gin.HandlerFunc {
	// Mapa simple para almacenar contadores por IP
	// En producción usar Redis o similar
	type rateLimitEntry struct {
		count     int
		resetTime time.Time
	}
	limits := make(map[string]*rateLimitEntry)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		now := time.Now()

		entry, exists := limits[clientIP]
		if !exists || now.After(entry.resetTime) {
			limits[clientIP] = &rateLimitEntry{
				count:     1,
				resetTime: now.Add(time.Minute),
			}
		} else {
			entry.count++
			if entry.count > requestsPerMinute {
				c.Header("Retry-After", "60")
				c.JSON(http.StatusTooManyRequests, models.ErrorResponse{
					Error: models.ErrorDetail{
						Code:    "RATE_LIMIT_EXCEEDED",
						Message: "Demasiadas solicitudes. Intente de nuevo en un minuto.",
					},
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// SecurityHeaders añade headers de seguridad
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevenir que el navegador detecte el tipo MIME
		c.Header("X-Content-Type-Options", "nosniff")

		// Habilitar protección XSS del navegador
		c.Header("X-XSS-Protection", "1; mode=block")

		// Prevenir clickjacking
		c.Header("X-Frame-Options", "DENY")

		// Política de seguridad de contenido
		c.Header("Content-Security-Policy", "default-src 'self'")

		// Strict Transport Security (HSTS)
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		c.Next()
	}
}

// Recovery middleware para recuperar de panics
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID, _ := c.Get("request_id")
				log.Printf("[PANIC] %v | Request ID: %v | Error: %v", time.Now(), requestID, err)

				c.JSON(http.StatusInternalServerError, models.ErrorResponse{
					Error: models.ErrorDetail{
						Code:    "INTERNAL_ERROR",
						Message: "Error interno del servidor",
					},
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}

// Timeout middleware para establecer timeout en peticiones
func Timeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Crear contexto con timeout
		// ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		// defer cancel()
		// c.Request = c.Request.WithContext(ctx)

		// Versión simplificada: solo añadir header
		c.Header("X-Request-Timeout", timeout.String())
		c.Next()
	}
}

// ContentTypeJSON asegura que las respuestas sean JSON
func ContentTypeJSON() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Type", "application/json; charset=utf-8")
		c.Next()
	}
}

// RequireContentType verifica que el Content-Type de la petición sea el esperado
func RequireContentType(contentTypes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "GET" || c.Request.Method == "DELETE" {
			c.Next()
			return
		}

		contentType := c.GetHeader("Content-Type")
		for _, ct := range contentTypes {
			if strings.Contains(contentType, ct) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusUnsupportedMediaType, models.ErrorResponse{
			Error: models.ErrorDetail{
				Code:    "UNSUPPORTED_MEDIA_TYPE",
				Message: "Content-Type no soportado. Use application/json",
			},
		})
		c.Abort()
	}
}

// MaxBodySize limita el tamaño del body de las peticiones
func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// generateRequestID genera un ID único para la petición
func generateRequestID() string {
	// Generar ID basado en timestamp y random
	timestamp := time.Now().UnixNano()
	// Formato: timestamp en base36 para hacerlo más corto
	return formatBase36(timestamp)
}

func formatBase36(n int64) string {
	const digits = "0123456789abcdefghijklmnopqrstuvwxyz"
	if n == 0 {
		return "0"
	}

	result := make([]byte, 0, 16)
	for n > 0 {
		result = append([]byte{digits[n%36]}, result...)
		n /= 36
	}
	return string(result)
}

// APIVersionHeader añade el header de versión de la API
func APIVersionHeader(version string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-API-Version", version)
		c.Next()
	}
}

// DeprecationWarning añade un header de deprecación para endpoints obsoletos
func DeprecationWarning(message string, sunsetDate string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Deprecation", "true")
		c.Header("Sunset", sunsetDate)
		c.Header("X-Deprecation-Message", message)
		c.Next()
	}
}
