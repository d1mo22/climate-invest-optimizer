MD per posar les idees que anem tenint  

Estructura tecnologica del projecte

  | Componente             | Tecnología              | Justificación                                                 |
  |------------------------|-------------------------|---------------------------------------------------------------|
  | Frontend               | **React + Vite**        | Rápido, flexible y compatible con librerías de visualización. |
  | Backend                | **Go (Gin Framework)**  | Alto rendimiento y estructura limpia de API REST.             |
  | Base de datos          | **PostgreSQL**          | Soporte geoespacial, maduro y robusto.                        |
  | Visualización de mapas | **Mapbox / Leaflet**    | Representación de tiendas y áreas de riesgo.                  |
  | Gráficos               | **Recharts / Chart.js** | KPIs e inversiones.                                           |
  | Infraestructura        | Docker + Docker Compose | Facilita despliegue y desarrollo local.                       |


Estructura del backend:
```go
backend/
├── main.go
├── routes/
│   └── routes.go
├── controllers/
│   └── stores.go
├── models/
│   └── store.go
└── db/
└── connection.go
```
Estructura del frontend:
```go
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/        → funciones que llaman a la API de Go
│   └── App.jsx
```