// Package handlers contiene utilidades para los handlers HTTP.
package handlers

import (
	"log"
	"net/http"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/gin-gonic/gin"
)

// respondWithSuccess envía una respuesta exitosa estandarizada
func respondWithSuccess[T any](c *gin.Context, status int, data T, message string) {
	response := models.APIResponse[T]{
		Success: true,
		Data:    data,
		Message: message,
	}
	c.JSON(status, response)
}

// respondWithError envía una respuesta de error estandarizada
func respondWithError(c *gin.Context, err error) {
	appErr, ok := err.(*models.AppError)
	if !ok {
		// Error desconocido - loguear y devolver error genérico
		log.Printf("Unexpected error: %v", err)
		appErr = models.ErrInternal
	}

	// Loguear error interno si existe
	if appErr.Internal != nil {
		log.Printf("Internal error [%s]: %v", appErr.Code, appErr.Internal)
	}

	c.JSON(appErr.HTTPStatus, appErr.ToResponse())
}

// bindAndValidate es un helper para binding y validación
func bindAndValidate[T any](c *gin.Context, req *T) bool {
	if err := c.ShouldBindJSON(req); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return false
	}
	return true
}

// getIDParam obtiene un ID de los parámetros de la ruta
func getIDParam(c *gin.Context, paramName string) (int64, bool) {
	idStr := c.Param(paramName)
	if idStr == "" {
		respondWithError(c, models.ErrInvalidID)
		return 0, false
	}

	var id int64
	_, err := c.GetQuery(paramName)
	if err {
		// Parámetro de query
		var convErr error
		id, convErr = parseInt64(idStr)
		if convErr != nil {
			respondWithError(c, models.ErrInvalidID)
			return 0, false
		}
	} else {
		// Parámetro de path
		var convErr error
		id, convErr = parseInt64(idStr)
		if convErr != nil {
			respondWithError(c, models.ErrInvalidID)
			return 0, false
		}
	}

	return id, true
}

func parseInt64(s string) (int64, error) {
	var id int64
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, models.ErrInvalidID
		}
		id = id*10 + int64(c-'0')
	}
	return id, nil
}

// Constantes para respuestas comunes
const (
	MsgCreated = "Recurso creado exitosamente"
	MsgUpdated = "Recurso actualizado exitosamente"
	MsgDeleted = "Recurso eliminado exitosamente"
)

// AbortWithError aborta la petición con un error
func AbortWithError(c *gin.Context, err error) {
	respondWithError(c, err)
	c.Abort()
}

// GetUserFromContext obtiene el usuario del contexto (después de auth middleware)
func GetUserFromContext(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}
	u, ok := user.(*models.User)
	return u, ok
}

// RequireRole verifica que el usuario tenga el rol requerido
func RequireRole(c *gin.Context, requiredRoles ...models.UserRole) bool {
	user, ok := GetUserFromContext(c)
	if !ok {
		AbortWithError(c, models.ErrUnauthorized)
		return false
	}

	for _, role := range requiredRoles {
		if user.Role == role {
			return true
		}
	}

	AbortWithError(c, models.ErrInsufficientRole)
	return false
}

// PaginationDefaults aplica valores por defecto a la paginación
func PaginationDefaults(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

// BuildPaginationMeta construye metadatos de paginación
func BuildPaginationMeta(page, pageSize int, total int64) models.PaginationMeta {
	page, pageSize = PaginationDefaults(page, pageSize)
	
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return models.PaginationMeta{
		Page:       page,
		PageSize:   pageSize,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

// NewNotFoundResponse crea una respuesta 404
func NewNotFoundResponse(resource string) models.ErrorResponse {
	return models.ErrorResponse{
		Error: models.ErrorDetail{
			Code:    "NOT_FOUND",
			Message: resource + " no encontrado",
		},
	}
}

// NewBadRequestResponse crea una respuesta 400
func NewBadRequestResponse(message string) models.ErrorResponse {
	return models.ErrorResponse{
		Error: models.ErrorDetail{
			Code:    "BAD_REQUEST",
			Message: message,
		},
	}
}

// LogRequest loguea información de la petición (para debugging)
func LogRequest(c *gin.Context) {
	log.Printf("[%s] %s %s", c.Request.Method, c.Request.URL.Path, c.ClientIP())
}

// WrapHandler permite convertir un handler simple a gin.HandlerFunc
func WrapHandler(fn func(c *gin.Context) error) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := fn(c); err != nil {
			respondWithError(c, err)
		}
	}
}

// CacheControl añade headers de cache a la respuesta
func CacheControl(maxAge int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if maxAge > 0 {
			c.Header("Cache-Control", "public, max-age="+string(rune(maxAge)))
		} else {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		}
		c.Next()
	}
}

// NoCacheHeaders añade headers para prevenir caching
func NoCacheHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// JSONContentType asegura que el Content-Type es application/json
func JSONContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Type", "application/json; charset=utf-8")
		c.Next()
	}
}

// RecoverPanic middleware para recuperar de panics
func RecoverPanic() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic recovered: %v", err)
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
