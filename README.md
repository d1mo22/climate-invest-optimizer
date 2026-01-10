# MANGO-PAE

Climate Investment Optimizer - A tool for managing climate risk mitigation measures across retail locations.

## API Endpoints

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
| GET | `/api/v1/shops/:id/risk-assessment` | Get risk assessment for a shop |
| GET | `/api/v1/shops/:id/risk-coverage` | Get risk coverage status for a shop |
| GET | `/api/v1/shops/:id/applicable-measures` | Get measures not yet applied to a shop |

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

## Risk Coverage Endpoint

The `/api/v1/shops/:id/risk-coverage` endpoint returns detailed information about which climate risks are covered by applied measures and which are not.

### Response Example

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

### Response Fields

- `shop_id`: The ID of the shop
- `shop_location`: The location name of the shop
- `shop_country`: The country where the shop is located
- `total_risks`: Total number of climate risks affecting the shop (via its cluster)
- `covered_risks`: Number of risks that have at least one applied measure covering them
- `uncovered_risks`: Number of risks with no applied measures covering them
- `coverage_percentage`: Percentage of risks that are covered (0-100)
- `risks`: Array of risk details:
  - `risk_id`: Unique identifier of the risk
  - `risk_name`: Name of the climate risk
  - `risk_score`: Calculated risk score (0-1) based on exposure, sensitivity, consequence, and probability
  - `is_covered`: Boolean indicating if any applied measure covers this risk
  - `covering_measures`: Array of measures already applied that cover this risk
  - `available_measures`: Array of measures not yet applied that could cover this risk
