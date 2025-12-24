// Package handlers contiene el handler de autenticación.
package handlers

import (
	"context"
	"net/http"

	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/models"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/domain/repository"
	"github.com/d1mo22/climate-invest-optimizer/backend/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler maneja las peticiones de autenticación
type AuthHandler struct {
	userRepo   repository.UserRepository
	jwtService *middleware.JWTService
}

// NewAuthHandler crea una nueva instancia de AuthHandler
func NewAuthHandler(userRepo repository.UserRepository, jwtService *middleware.JWTService) *AuthHandler {
	return &AuthHandler{
		userRepo:   userRepo,
		jwtService: jwtService,
	}
}

// Login godoc
// @Summary Iniciar sesión
// @Description Autentica un usuario y retorna un token JWT
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body models.LoginRequest true "Credenciales de usuario"
// @Success 200 {object} models.APIResponse[models.AuthResponse]
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return
	}

	// Buscar usuario por email
	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		respondWithError(c, models.ErrDatabase(err))
		return
	}
	if user == nil {
		respondWithError(c, models.ErrInvalidCredentials)
		return
	}

	// Verificar contraseña
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		respondWithError(c, models.ErrInvalidCredentials)
		return
	}

	// Generar token
	token, expiresAt, err := h.jwtService.GenerateToken(user)
	if err != nil {
		respondWithError(c, models.ErrInternal.WithInternal(err))
		return
	}

	response := models.AuthResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}
	response.User.ID = user.ID
	response.User.Email = user.Email
	response.User.Role = user.Role

	respondWithSuccess(c, http.StatusOK, response, "Inicio de sesión exitoso")
}

// Register godoc
// @Summary Registrar nuevo usuario
// @Description Crea una nueva cuenta de usuario
// @Tags auth
// @Accept json
// @Produce json
// @Param user body models.RegisterRequest true "Datos del usuario"
// @Success 201 {object} models.APIResponse[models.AuthResponse]
// @Failure 400 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse "Email ya registrado"
// @Failure 500 {object} models.ErrorResponse
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, models.ErrInvalidInput(err.Error()))
		return
	}

	// Verificar si el email ya existe
	exists, err := h.userRepo.EmailExists(c.Request.Context(), req.Email)
	if err != nil {
		respondWithError(c, models.ErrDatabase(err))
		return
	}
	if exists {
		respondWithError(c, models.ErrDuplicateEmail)
		return
	}

	// Hash de la contraseña
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondWithError(c, models.ErrInternal.WithInternal(err))
		return
	}

	// Asignar rol por defecto
	role := req.Role
	if role == "" {
		role = models.RoleViewer
	}

	// Crear usuario
	user := &models.User{
		Email:    req.Email,
		Password: string(hashedPassword),
		Role:     role,
	}

	if err := h.userRepo.Create(c.Request.Context(), user); err != nil {
		respondWithError(c, models.ErrDatabase(err))
		return
	}

	// Generar token
	token, expiresAt, err := h.jwtService.GenerateToken(user)
	if err != nil {
		respondWithError(c, models.ErrInternal.WithInternal(err))
		return
	}

	response := models.AuthResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}
	response.User.ID = user.ID
	response.User.Email = user.Email
	response.User.Role = user.Role

	respondWithSuccess(c, http.StatusCreated, response, "Usuario registrado exitosamente")
}

// RefreshToken godoc
// @Summary Refrescar token
// @Description Genera un nuevo token JWT a partir de uno existente
// @Tags auth
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} models.APIResponse[models.AuthResponse]
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/refresh [post]
// @Security BearerAuth
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Obtener token del header
	authHeader := c.GetHeader("Authorization")
	if len(authHeader) < 8 {
		respondWithError(c, models.ErrUnauthorized)
		return
	}
	tokenString := authHeader[7:] // Quitar "Bearer "

	// Refrescar token
	newToken, expiresAt, err := h.jwtService.RefreshToken(tokenString)
	if err != nil {
		respondWithError(c, models.ErrInvalidToken)
		return
	}

	// Obtener claims para la respuesta
	claims, _ := h.jwtService.ValidateToken(newToken)

	response := models.AuthResponse{
		Token:     newToken,
		ExpiresAt: expiresAt,
	}
	response.User.ID = claims.UserID
	response.User.Email = claims.Email
	response.User.Role = claims.Role

	respondWithSuccess(c, http.StatusOK, response, "Token refrescado exitosamente")
}

// GetCurrentUser godoc
// @Summary Obtener usuario actual
// @Description Retorna la información del usuario autenticado
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse[models.User]
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/me [get]
// @Security BearerAuth
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		respondWithError(c, models.ErrUnauthorized)
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID.(int64))
	if err != nil {
		respondWithError(c, models.ErrDatabase(err))
		return
	}
	if user == nil {
		respondWithError(c, models.ErrUserNotFound)
		return
	}

	// No exponer password
	user.Password = ""

	respondWithSuccess(c, http.StatusOK, user, "")
}

// Logout godoc
// @Summary Cerrar sesión
// @Description Invalida el token actual (nota: JWT es stateless, esto es simbólico)
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse[string]
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/logout [post]
// @Security BearerAuth
func (h *AuthHandler) Logout(c *gin.Context) {
	// JWT es stateless, así que no podemos invalidar el token del servidor
	// En una implementación real, podríamos:
	// 1. Añadir el token a una blacklist en Redis
	// 2. Implementar tokens de corta duración con refresh tokens
	// Por ahora, simplemente respondemos exitosamente

	respondWithSuccess(c, http.StatusOK, "ok", "Sesión cerrada exitosamente")
}

// AuthService interface para testing
type AuthService interface {
	Login(ctx context.Context, email, password string) (*models.AuthResponse, error)
	Register(ctx context.Context, req *models.RegisterRequest) (*models.AuthResponse, error)
	RefreshToken(ctx context.Context, token string) (*models.AuthResponse, error)
}
