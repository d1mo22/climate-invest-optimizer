// Package middleware contiene el middleware de autenticación JWT.
package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTConfig contiene la configuración para JWT
type JWTConfig struct {
	SecretKey     string
	TokenExpiry   time.Duration
	RefreshExpiry time.Duration
	Issuer        string
}

// JWTClaims representa los claims del token JWT
type JWTClaims struct {
	UserID int64           `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

// JWTService maneja la generación y validación de tokens JWT
type JWTService struct {
	config JWTConfig
}

// NewJWTService crea una nueva instancia de JWTService
func NewJWTService(config JWTConfig) *JWTService {
	return &JWTService{config: config}
}

// GenerateToken genera un nuevo token JWT
func (s *JWTService) GenerateToken(user *models.User) (string, int64, error) {
	expiresAt := time.Now().Add(s.config.TokenExpiry)

	claims := JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    s.config.Issuer,
			Subject:   user.Email,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.config.SecretKey))
	if err != nil {
		return "", 0, err
	}

	return tokenString, expiresAt.Unix(), nil
}

// ValidateToken valida un token JWT y retorna los claims
func (s *JWTService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verificar el algoritmo de firma
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("método de firma inválido")
		}
		return []byte(s.config.SecretKey), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("token inválido")
	}

	return claims, nil
}

// RefreshToken genera un nuevo token a partir de uno existente (antes de que expire)
func (s *JWTService) RefreshToken(tokenString string) (string, int64, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return "", 0, err
	}

	// Crear usuario temporal para generar nuevo token
	user := &models.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  claims.Role,
	}

	return s.GenerateToken(user)
}

// AuthMiddleware verifica que la petición tenga un token JWT válido
func AuthMiddleware(jwtService *JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener el header Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: models.ErrorDetail{
					Code:    "UNAUTHORIZED",
					Message: "Token de autorización requerido",
				},
			})
			c.Abort()
			return
		}

		// Verificar formato "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: models.ErrorDetail{
					Code:    "INVALID_TOKEN_FORMAT",
					Message: "Formato de token inválido. Use: Bearer <token>",
				},
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validar token
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: models.ErrorDetail{
					Code:    "INVALID_TOKEN",
					Message: "Token inválido o expirado",
				},
			})
			c.Abort()
			return
		}

		// Guardar claims en el contexto para uso posterior
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// RequireRole middleware que verifica que el usuario tenga uno de los roles requeridos
func RequireRole(roles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: models.ErrorDetail{
					Code:    "UNAUTHORIZED",
					Message: "No autenticado",
				},
			})
			c.Abort()
			return
		}

		role := userRole.(models.UserRole)
		for _, requiredRole := range roles {
			if role == requiredRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error: models.ErrorDetail{
				Code:    "FORBIDDEN",
				Message: "No tiene permisos para realizar esta acción",
			},
		})
		c.Abort()
	}
}

// OptionalAuth middleware que intenta extraer el usuario pero no falla si no hay token
func OptionalAuth(jwtService *JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.Next()
			return
		}

		claims, err := jwtService.ValidateToken(parts[1])
		if err != nil {
			c.Next()
			return
		}

		// Token válido - guardar en contexto
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("claims", claims)
		c.Set("authenticated", true)

		c.Next()
	}
}

// GetUserIDFromContext obtiene el ID del usuario del contexto
func GetUserIDFromContext(c *gin.Context) (int64, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	id, ok := userID.(int64)
	return id, ok
}

// GetUserRoleFromContext obtiene el rol del usuario del contexto
func GetUserRoleFromContext(c *gin.Context) (models.UserRole, bool) {
	role, exists := c.Get("user_role")
	if !exists {
		return "", false
	}
	r, ok := role.(models.UserRole)
	return r, ok
}

// IsAdmin verifica si el usuario actual es administrador
func IsAdmin(c *gin.Context) bool {
	role, ok := GetUserRoleFromContext(c)
	return ok && role == models.RoleAdmin
}

// IsAuthenticated verifica si el usuario está autenticado
func IsAuthenticated(c *gin.Context) bool {
	_, exists := c.Get("user_id")
	return exists
}
