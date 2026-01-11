// Package models contiene las definiciones de errores de la aplicación.
package models

import (
	"fmt"
	"net/http"
)

// AppError representa un error de la aplicación con código HTTP
type AppError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	HTTPStatus int    `json:"-"`
	Internal   error  `json:"-"` // Error interno para logging
}

func (e *AppError) Error() string {
	if e.Internal != nil {
		return fmt.Sprintf("%s: %s (internal: %v)", e.Code, e.Message, e.Internal)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// ErrorResponse representa el formato estándar de error en las respuestas
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail contiene los detalles del error
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewAppError crea un nuevo error de aplicación
func NewAppError(code string, message string, httpStatus int, internal error) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
		Internal:   internal,
	}
}

// ============================================================================
// Errores predefinidos
// ============================================================================

// Errores de validación (400)
var (
	ErrInvalidInput = func(details string) *AppError {
		return NewAppError("VALIDATION_ERROR", details, http.StatusBadRequest, nil)
	}
	ErrInvalidID         = NewAppError("INVALID_ID", "El ID proporcionado no es válido", http.StatusBadRequest, nil)
	ErrInvalidPagination = NewAppError("INVALID_PAGINATION", "Parámetros de paginación inválidos", http.StatusBadRequest, nil)
	ErrInvalidBudget     = NewAppError("INVALID_BUDGET", "El presupuesto debe ser mayor a 0", http.StatusBadRequest, nil)
)

// Errores de autenticación (401)
var (
	ErrUnauthorized       = NewAppError("UNAUTHORIZED", "No autorizado. Por favor, inicie sesión", http.StatusUnauthorized, nil)
	ErrInvalidToken       = NewAppError("INVALID_TOKEN", "Token de autenticación inválido o expirado", http.StatusUnauthorized, nil)
	ErrInvalidCredentials = NewAppError("INVALID_CREDENTIALS", "Email o contraseña incorrectos", http.StatusUnauthorized, nil)
)

// Errores de autorización (403)
var (
	ErrForbidden        = NewAppError("FORBIDDEN", "No tiene permisos para realizar esta acción", http.StatusForbidden, nil)
	ErrInsufficientRole = NewAppError("INSUFFICIENT_ROLE", "Su rol no permite realizar esta acción", http.StatusForbidden, nil)
)

// Errores de recurso no encontrado (404)
var (
	ErrShopNotFound     = NewAppError("SHOP_NOT_FOUND", "Tienda no encontrada", http.StatusNotFound, nil)
	ErrClusterNotFound  = NewAppError("CLUSTER_NOT_FOUND", "Cluster no encontrado", http.StatusNotFound, nil)
	ErrRiskNotFound     = NewAppError("RISK_NOT_FOUND", "Riesgo no encontrado", http.StatusNotFound, nil)
	ErrMeasureNotFound  = NewAppError("MEASURE_NOT_FOUND", "Medida no encontrada", http.StatusNotFound, nil)
	ErrUserNotFound     = NewAppError("USER_NOT_FOUND", "Usuario no encontrado", http.StatusNotFound, nil)
	ErrResourceNotFound = func(resource string) *AppError {
		return NewAppError("NOT_FOUND", fmt.Sprintf("%s no encontrado", resource), http.StatusNotFound, nil)
	}
)

// Errores de conflicto (409)
var (
	ErrDuplicateEmail        = NewAppError("DUPLICATE_EMAIL", "El email ya está registrado", http.StatusConflict, nil)
	ErrMeasureAlreadyApplied = NewAppError("MEASURE_ALREADY_APPLIED", "La medida ya está aplicada a esta tienda", http.StatusConflict, nil)
	ErrMeasureNotApplied     = NewAppError("MEASURE_NOT_APPLIED", "La medida no está aplicada a esta tienda", http.StatusNotFound, nil)
	ErrDuplicateResource     = func(resource string) *AppError {
		return NewAppError("DUPLICATE_RESOURCE", fmt.Sprintf("%s ya existe", resource), http.StatusConflict, nil)
	}
)

// Errores de servidor (500)
var (
	ErrInternal = NewAppError("INTERNAL_ERROR", "Error interno del servidor", http.StatusInternalServerError, nil)
	ErrDatabase = func(err error) *AppError {
		return NewAppError("DATABASE_ERROR", "Error al acceder a la base de datos", http.StatusInternalServerError, err)
	}
	ErrOptimization = func(err error) *AppError {
		return NewAppError("OPTIMIZATION_ERROR", "Error durante el proceso de optimización", http.StatusInternalServerError, err)
	}
)

// Errores de negocio (422)
var (
	ErrInsufficientBudget  = NewAppError("INSUFFICIENT_BUDGET", "El presupuesto es insuficiente para cualquier medida", http.StatusUnprocessableEntity, nil)
	ErrNoMeasuresAvailable = NewAppError("NO_MEASURES_AVAILABLE", "No hay medidas disponibles para los riesgos identificados", http.StatusUnprocessableEntity, nil)
	ErrNoShopsSelected     = NewAppError("NO_SHOPS_SELECTED", "Debe seleccionar al menos una tienda", http.StatusUnprocessableEntity, nil)
)

// WithInternal añade un error interno para logging
func (e *AppError) WithInternal(err error) *AppError {
	return &AppError{
		Code:       e.Code,
		Message:    e.Message,
		HTTPStatus: e.HTTPStatus,
		Internal:   err,
	}
}

// ToResponse convierte el error a formato de respuesta
func (e *AppError) ToResponse() ErrorResponse {
	return ErrorResponse{
		Error: ErrorDetail{
			Code:    e.Code,
			Message: e.Message,
		},
	}
}
