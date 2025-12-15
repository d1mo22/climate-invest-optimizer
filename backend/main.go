package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

var supabaseClient *supabase.Client

func main() {
    // Cargar variables de entorno desde .env
    err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    // Obtener API_URL y API_KEY del .env
    apiURL := os.Getenv("API_URL")
    apiKey := os.Getenv("API_KEY")

    if apiURL == "" || apiKey == "" {
        log.Fatal("API_URL or API_KEY not set in .env file")
    }

    supabaseClient, err = supabase.NewClient(apiURL, apiKey, &supabase.ClientOptions{})
    if err != nil {
        log.Fatal("Failed to initialize the client: ", err)
    }

    log.Println("Supabase client initialized successfully!")

    // Configurar Gin
    router := gin.Default()

    // Rutas de la API
    api := router.Group("/api/v1")
    {
        api.GET("/shops", healthCheck)
        // Aquí puedes agregar más rutas
        //api.GET("/clusters", getClusters)
        //api.GET("/measures", getMeasures)
        // api.POST("/projects", createProject)
    }

    // Iniciar servidor
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server running on port %s", port)
    router.Run(":" + port)
}

func healthCheck(c *gin.Context) {
    c.JSON(200, gin.H{
        "status": "ok",
        "message": "API is running",
    })
}