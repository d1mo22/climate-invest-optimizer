# MANGO-PAE — Climate Invest Optimizer

Herramienta para gestionar y optimizar inversiones en medidas de mitigación de riesgos climáticos sobre una red de tiendas (retail locations).

## 👥 Autores

- Eudald Pizarro Cami
- David Morais Caldas
- Marc Teixidó Sala
- Èric Díez Apolo

## 🧩 Estructura del repositorio

Este monorepo tiene dos componentes principales:

- `frontend/`: aplicación web (React + TypeScript + Vite)
- `backend/`: API REST (Go) para datos, riesgos, medidas y optimización

## 🚀 Inicio rápido

### Frontend (Vite)

Requisitos: Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

### Backend (Go)

Requisitos:

- Go 1.21+
- PostgreSQL (o Supabase)

```bash
cd backend
go mod tidy

# (Opcional) configurar variables de entorno
cp .env.example .env

go run cmd/api/main.go
```

Por defecto la API queda en `http://localhost:8080` (dependiendo de `PORT`).

## 🏗️ Arquitectura (Backend)

El backend sigue principios de **Clean Architecture** con separación clara de responsabilidades:

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
│   │   ├── models/              # Entidades del dominio
│   │   └── repository/          # Interfaces repositorios
│   ├── application/
│   │   └── services/            # Lógica de negocio
│   ├── infrastructure/
│   │   └── persistence/         # Implementaciones (Postgres, etc.)
│   └── interfaces/
│       └── http/                # Handlers, middleware, router
└── data/
    ├── measures.csv
    └── risks.csv
```

### Modelo de datos

Las tiendas (Shops) y clusters utilizan **coordenadas UTM** para la geolocalización:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `utm_north` | float64 | Coordenada UTM Norte |
| `utm_east` | float64 | Coordenada UTM Este |

## ⚙️ Variables de entorno (Backend)

Ejemplo:

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

### Shops

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/shops` | List all shops (paginated) |
| GET | `/api/v1/shops/:id` | Get shop details |
| POST | `/api/v1/shops` | Create a new shop |
| PATCH | `/api/v1/shops/:id` | Update a shop |
| DELETE | `/api/v1/shops/:id` | Delete a shop |
| GET | `/api/v1/shops/:id/measures` | Get applied measures for a shop |
| POST | `/api/v1/shops/:id/measures` | Apply measures to a shop |
| DELETE | `/api/v1/shops/:id/measures/:measureName` | Remove a measure from a shop |
| GET | `/api/v1/shops/:id/applicable-measures` | Get measures not yet applied to a shop |
| GET | `/api/v1/shops/:id/risk-assessment` | Get risk assessment for a shop |
| GET | `/api/v1/shops/:id/risk-coverage` | Get risk coverage status for a shop |

### Clusters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/clusters` | List all clusters |
| GET | `/api/v1/clusters/:id` | Get cluster details |
| GET | `/api/v1/clusters/:id/shops` | Get shops in a cluster |
| GET | `/api/v1/clusters/:id/risks` | Get risks for a cluster |

### Measures

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/measures` | List all measures |
| GET | `/api/v1/measures?type=natural` | Filter by type (backend) |
| GET | `/api/v1/measures/:name` | Get measure by name |

### Risks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/risks` | List all risks |
| GET | `/api/v1/risks/:id` | Get risk by ID |
| GET | `/api/v1/risks/:id/measures` | Get measures that cover a risk |

### Optimization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/optimization/budget` | Optimize measure allocation within budget |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Get dashboard statistics |

## 🧮 Algoritmo de Optimización

El endpoint de optimización soporta tres estrategias:

### 1. Greedy (default)

Complejidad: `O(n log n)`

- Ordena medidas por eficiencia (reducción/costo)
- Selecciona en orden hasta agotar presupuesto

### 2. Knapsack

Complejidad: `O(n × W)`

- Programación dinámica
- Garantiza solución óptima

### 3. Weighted

Complejidad: `O(n log n)`

- Considera prioridades de riesgos
- Greedy modificado con pesos

### Ejemplo de request

```json
POST /api/v1/optimization/budget
{
  "shop_ids": [1, 2, 3],
  "max_budget": 50000,
  "strategy": "greedy",
  "risk_priorities": [1, 5]
}
```

## 🧪 Testing (Backend)

```bash
cd backend
go test ./...
```

## 📄 OpenAPI

La especificación está en `backend/api/openapi.yaml`.

Puedes visualizarla con Swagger UI (Docker):

```bash
docker run -p 8081:8080 -e SWAGGER_JSON=/api/openapi.yaml \
  -v $(pwd)/backend/api:/api swaggerapi/swagger-ui
```

## 🔎 Risk Coverage endpoint

El endpoint `/api/v1/shops/:id/risk-coverage` devuelve información detallada sobre qué riesgos están cubiertos por medidas aplicadas y cuáles no.

### Response example

```json
{
  "success": true,
  "data": {
    "shop_id": 1,
    "shop_location": "Barcelona Centro",
    "shop_country": "Spain",
    "total_risks": 5,
    "covered_risks": 3,
    "uncovered_risks": 2,
    "coverage_percentage": 60.0,
    "risks": [
      {
        "risk_id": 1,
        "risk_name": "Inundacion costera/fluvial/pluvial",
        "risk_score": 0.42,
        "is_covered": true,
        "covering_measures": [
          {
            "name": "Barreras de proteccion contra inundaciones",
            "estimated_cost": 4000,
            "type": "material"
          }
        ],
        "available_measures": [
          {
            "name": "Elevacion del suelo",
            "estimated_cost": 5000,
            "type": "material"
          }
        ]
      },
      {
        "risk_id": 2,
        "risk_name": "Sequia",
        "risk_score": 0.35,
        "is_covered": false,
        "available_measures": [
          {
            "name": "Sistema de riego eficiente",
            "estimated_cost": 2000,
            "type": "material"
          }
        ]
      }
    ]
  }
}
```

## 📜 Licencia

Apache 2.0 License - ver `LICENSE` para detalles.


Puedes aplicar el estilo de ver mapa del dashboard global al de pais tambien, el Ver Mapa del country no funcoina  
sale este error (No se encontró el país para slug "espana". El error se recrea, primero yendo al dashboard      
global y luego en la parte de abajo donde aparecen los paises hacer click en espana y sale este error). Tambien  
cuando voy a ver las medidas que hay para afrontar un riesgo me sale una lista muy larga. Puedes hacer que       
aparezcan 5 o 10 y que los demas tenga una flecha para ver los 10 siguientes y un buscador para buscar por       
palabras.    