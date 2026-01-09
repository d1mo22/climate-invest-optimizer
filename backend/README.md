# Climate Invest Optimizer - Backend API

API REST en Go para la optimización de presupuestos de inmuebles orientada a la prevención y mitigación de riesgos climáticos.

## 🏗️ Arquitectura

El proyecto sigue los principios de **Clean Architecture** con una clara separación de responsabilidades:

```
backend/
├── cmd/
│   └── api/
│       └── main.go              # Punto de entrada de la aplicación
├── api/
│   └── openapi.yaml             # Documentación OpenAPI/Swagger
├── internal/
│   ├── config/
│   │   └── config.go            # Configuración de la aplicación
│   ├── domain/
│   │   ├── models/
│   │   │   ├── models.go        # Entidades del dominio
│   │   │   ├── dto.go           # Data Transfer Objects
│   │   │   └── errors.go        # Errores de negocio
│   │   └── repository/
│   │       └── interfaces.go    # Interfaces de repositorios
│   ├── application/
│   │   └── services/
│   │       ├── shop_service.go        # Lógica de negocio - Tiendas
│   │       ├── optimization_service.go # Algoritmos de optimización
│   │       └── other_services.go       # Otros servicios
│   ├── infrastructure/
│   │   └── persistence/
│   │       └── postgres/
│   │           ├── connection.go       # Conexión a BD
│   │           ├── shop_repository.go  # Implementación repositorio
│   │           └── other_repositories.go
│   └── interfaces/
│       └── http/
│           ├── handlers/
│           │   ├── shop_handler.go     # Controladores HTTP
│           │   ├── auth_handler.go     # Autenticación
│           │   ├── other_handlers.go   # Otros handlers
│           │   └── utils.go            # Utilidades
│           ├── middleware/
│           │   ├── middleware.go       # Middlewares generales
│           │   └── auth.go             # JWT Auth middleware
│           └── router/
│               └── router.go           # Configuración de rutas
└── data/
    ├── measures.csv             # Datos de medidas
    └── risks.csv                # Datos de riesgos
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Go 1.21+
- PostgreSQL (o Supabase)

### Modelo de Datos

Las tiendas (Shops) y clusters utilizan **coordenadas UTM** para la geolocalización:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `utm_north` | float64 | Coordenada UTM Norte |
| `utm_east` | float64 | Coordenada UTM Este |

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/d1mo22/climate-invest-optimizer.git
cd climate-invest-optimizer/backend

# Instalar dependencias
go mod tidy

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar
go run cmd/api/main.go
```

### Variables de Entorno

```env
# Servidor
PORT=8080
HOST=0.0.0.0

# Base de datos (Supabase pooler - puerto 6543)
# IMPORTANTE: Añadir ?default_query_exec_mode=exec para Supabase pooler
DATABASE_URL=postgresql://postgres.xxx:password@xxx.pooler.supabase.com:6543/postgres?default_query_exec_mode=exec
API_URL=https://your-project.supabase.co/rest/v1
API_KEY=your-anon-key

# JWT
JWT_SECRET=your-256-bit-secret-key
JWT_TOKEN_EXPIRY=24h

# Aplicación
APP_ENV=development
DEBUG=true

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 📚 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/register` | Registrar usuario |
| POST | `/api/v1/auth/refresh` | Refrescar token |
| GET | `/api/v1/auth/me` | Obtener usuario actual |

### Tiendas (Shops)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/shops` | Listar tiendas (paginado) |
| GET | `/api/v1/shops/:id` | Obtener tienda por ID |
| POST | `/api/v1/shops` | Crear tienda |
| PATCH | `/api/v1/shops/:id` | Actualizar tienda |
| DELETE | `/api/v1/shops/:id` | Eliminar tienda |
| GET | `/api/v1/shops/:id/measures` | Obtener medidas aplicadas |
| POST | `/api/v1/shops/:id/measures` | Aplicar medidas |
| DELETE | `/api/v1/shops/:id/measures/:name` | Eliminar medida aplicada |
| GET | `/api/v1/shops/:id/applicable-measures` | Medidas disponibles para aplicar |
| GET | `/api/v1/shops/:id/risk-assessment` | Evaluación de riesgos |

### Clusters

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/clusters` | Listar clusters |
| GET | `/api/v1/clusters/:id` | Obtener cluster con riesgos |
| GET | `/api/v1/clusters/:id/shops` | Tiendas del cluster |
| GET | `/api/v1/clusters/:id/risks` | Riesgos del cluster |

### Medidas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/measures` | Listar medidas |
| GET | `/api/v1/measures?type=natural` | Filtrar por tipo |
| GET | `/api/v1/measures/:name` | Obtener medida |

### Riesgos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/risks` | Listar todos los riesgos climáticos |
| GET | `/api/v1/risks/:id` | Obtener riesgo por ID |
| GET | `/api/v1/risks/:id/measures` | Obtener medidas que mitigan un riesgo |

### Optimización

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/optimization/budget` | Optimizar presupuesto |

### Dashboard

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Estadísticas generales |

## 🧮 Algoritmo de Optimización

El endpoint de optimización soporta tres estrategias:

### 1. Greedy (Default)
```
Complejidad: O(n log n)
```
- Ordena medidas por eficiencia (reducción/costo)
- Selecciona en orden hasta agotar presupuesto
- Rápido y produce buenos resultados

### 2. Knapsack
```
Complejidad: O(n × W)
```
- Programación dinámica
- Garantiza solución óptima
- Mejor para presupuestos medianos

### 3. Weighted
```
Complejidad: O(n log n)
```
- Considera prioridades de riesgos
- Greedy modificado con pesos
- Útil cuando hay riesgos prioritarios

### Ejemplo de Request

```json
POST /api/v1/optimization/budget
{
  "shop_ids": [1, 2, 3],
  "max_budget": 50000,
  "strategy": "greedy",
  "risk_priorities": [1, 5]
}
```

### Ejemplo de Response

```json
{
  "success": true,
  "data": {
    "total_cost": 45500,
    "remaining_budget": 4500,
    "total_risk_reduction": 35.5,
    "recommended_measures": [
      {
        "measure": {
          "name": "Sistema de drenaje perimetral",
          "estimated_cost": 4500,
          "type": "material"
        },
        "priority": 1,
        "risk_reduction_percentage": 12.5,
        "affected_risks": ["Inundación costera/fluvial/pluvial"],
        "justification": "Medida con alta eficiencia..."
      }
    ],
    "shop_recommendations": [...],
    "strategy_used": "greedy",
    "metrics": {
      "budget_utilization_percentage": 91.0,
      "average_risk_reduction": 15.5,
      "estimated_roi": 2.5,
      "processing_time_ms": 45
    }
  }
}
```

## 🔐 Seguridad

### Autenticación JWT

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Usar token
curl http://localhost:8080/api/v1/shops \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Roles de Usuario

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso completo |
| `manager` | CRUD de recursos |
| `viewer` | Solo lectura |

## 📝 Formato de Errores

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El campo 'location' es requerido"
  }
}
```

### Códigos de Error

| Código HTTP | Code | Descripción |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Error de validación |
| 401 | `UNAUTHORIZED` | No autenticado |
| 403 | `FORBIDDEN` | Sin permisos |
| 404 | `NOT_FOUND` | Recurso no encontrado |
| 409 | `DUPLICATE_RESOURCE` | Recurso duplicado |
| 422 | `BUSINESS_ERROR` | Error de negocio |
| 500 | `INTERNAL_ERROR` | Error del servidor |

## 🧪 Testing

```bash
# Ejecutar tests
go test ./...

# Con coverage
go test -cover ./...

# Verbose
go test -v ./...
```

## 🔧 Decisiones Técnicas

### ¿Por qué Gin?

- **Rendimiento**: Uno de los frameworks más rápidos
- **Simplicidad**: API intuitiva y bien documentada
- **Ecosistema**: Amplia comunidad y middlewares
- **Validación**: Integración con `validator`

### ¿Por qué Clean Architecture?

- **Testabilidad**: Fácil de mockear dependencias
- **Mantenibilidad**: Cambios aislados por capa
- **Escalabilidad**: Fácil agregar nuevas funcionalidades
- **Independencia**: Dominio aislado de infraestructura

### ¿Por qué JWT?

- **Stateless**: No requiere almacenamiento de sesión
- **Escalable**: Funciona con múltiples instancias
- **Estándar**: Ampliamente adoptado y seguro

## 📄 Documentación OpenAPI

La especificación completa está en `api/openapi.yaml`. Puedes visualizarla con:

```bash
# Usando Swagger UI Docker
docker run -p 8081:8080 -e SWAGGER_JSON=/api/openapi.yaml \
  -v $(pwd)/api:/api swaggerapi/swagger-ui
```

O importar en [Swagger Editor](https://editor.swagger.io/).

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing`)
5. Abrir Pull Request

## 📜 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.
