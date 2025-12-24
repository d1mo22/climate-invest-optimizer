// Package config maneja la configuración de la aplicación.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config contiene toda la configuración de la aplicación
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	App      AppConfig
}

// ServerConfig contiene la configuración del servidor HTTP
type ServerConfig struct {
	Port            string
	Host            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	AllowedOrigins  []string
}

// DatabaseConfig contiene la configuración de la base de datos
type DatabaseConfig struct {
	URL             string // PostgreSQL connection string (DATABASE_URL)
	SupabaseURL     string // Supabase REST API URL (API_URL)
	SupabaseKey     string // Supabase API Key (API_KEY)
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// JWTConfig contiene la configuración de JWT
type JWTConfig struct {
	SecretKey     string
	TokenExpiry   time.Duration
	RefreshExpiry time.Duration
	Issuer        string
}

// AppConfig contiene configuración general de la aplicación
type AppConfig struct {
	Environment string // development, staging, production
	Debug       bool
	LogLevel    string
}

// Load carga la configuración desde variables de entorno
func Load() (*Config, error) {
	config := &Config{
		Server: ServerConfig{
			Port:            getEnvOrDefault("PORT", "8080"),
			Host:            getEnvOrDefault("HOST", "0.0.0.0"),
			ReadTimeout:     getDurationOrDefault("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    getDurationOrDefault("SERVER_WRITE_TIMEOUT", 15*time.Second),
			ShutdownTimeout: getDurationOrDefault("SERVER_SHUTDOWN_TIMEOUT", 30*time.Second),
			AllowedOrigins:  getEnvSliceOrDefault("ALLOWED_ORIGINS", []string{"http://localhost:5173", "http://localhost:3000"}),
		},
		Database: DatabaseConfig{
			URL:             os.Getenv("DATABASE_URL"), // PostgreSQL direct connection
			SupabaseURL:     os.Getenv("API_URL"),      // Supabase REST API
			SupabaseKey:     os.Getenv("API_KEY"),      // Supabase API Key
			MaxOpenConns:    getIntOrDefault("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getIntOrDefault("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getDurationOrDefault("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		JWT: JWTConfig{
			SecretKey:     getEnvOrDefault("JWT_SECRET", "your-256-bit-secret-key-change-in-production"),
			TokenExpiry:   getDurationOrDefault("JWT_TOKEN_EXPIRY", 24*time.Hour),
			RefreshExpiry: getDurationOrDefault("JWT_REFRESH_EXPIRY", 7*24*time.Hour),
			Issuer:        getEnvOrDefault("JWT_ISSUER", "climate-invest-optimizer"),
		},
		App: AppConfig{
			Environment: getEnvOrDefault("APP_ENV", "development"),
			Debug:       getBoolOrDefault("DEBUG", true),
			LogLevel:    getEnvOrDefault("LOG_LEVEL", "debug"),
		},
	}

	// Validar configuración requerida
	if err := config.Validate(); err != nil {
		return nil, err
	}

	return config, nil
}

// Validate verifica que la configuración sea válida
func (c *Config) Validate() error {
	if c.Database.URL == "" {
		return fmt.Errorf("DATABASE_URL is required for PostgreSQL connection")
	}
	if c.JWT.SecretKey == "" || c.JWT.SecretKey == "your-256-bit-secret-key-change-in-production" {
		if c.App.Environment == "production" {
			return fmt.Errorf("JWT_SECRET must be set in production")
		}
	}
	return nil
}

// IsDevelopment retorna true si estamos en desarrollo
func (c *Config) IsDevelopment() bool {
	return c.App.Environment == "development"
}

// IsProduction retorna true si estamos en producción
func (c *Config) IsProduction() bool {
	return c.App.Environment == "production"
}

// Helper functions

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getBoolOrDefault(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}

func getDurationOrDefault(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvSliceOrDefault(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Parsear valores separados por coma
		var result []string
		start := 0
		for i := 0; i <= len(value); i++ {
			if i == len(value) || value[i] == ',' {
				if i > start {
					result = append(result, value[start:i])
				}
				start = i + 1
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}
