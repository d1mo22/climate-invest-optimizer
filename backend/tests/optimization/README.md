# 🧪 Tests de Algoritmos de Optimización

Este directorio contiene tests exhaustivos para los algoritmos de optimización de presupuesto de Climate Invest Optimizer.

## 📁 Estructura

```
tests/
├── optimization/
│   ├── optimization_test.go     # Tests unitarios en Go (30+ tests)
│   ├── run_optimization_tests.sh # Tests de integración bash (24+ tests)
│   └── README.md
└── services/
    └── shop_service_test.go     # Tests del servicio de tiendas (16 tests)
```

## 🧪 Tests Unitarios (Go)

### Ejecutar Tests
```bash
# Desde el directorio backend
cd /home/david/climate-invest-optimizer/backend

# Ejecutar todos los tests
go test ./tests/... -v

# Ejecutar solo tests de optimización
go test ./tests/optimization/... -v

# Ejecutar solo tests de servicios
go test ./tests/services/... -v

# Ejecutar con benchmarks
go test ./tests/... -bench=. -benchmem

# Ejecutar tests con cobertura
go test ./tests/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Categorías de Tests Unitarios

#### Optimization Service (30+ tests)
| Categoría | Descripción | Cantidad |
|-----------|-------------|----------|
| Greedy Algorithm | Tests del algoritmo greedy con diferentes presupuestos | 5 |
| Knapsack Algorithm | Tests del algoritmo de mochila | 3 |
| Weighted Algorithm | Tests del algoritmo con prioridades | 3 |
| Edge Cases | Casos límite (presupuesto mínimo/máximo, errores) | 6 |
| Algorithm Comparison | Comparación entre algoritmos | 2 |
| Budget Utilization | Verificación de uso eficiente del presupuesto | 2 |
| Multi-Shop Distribution | Distribución entre múltiples tiendas | 2 |
| Metrics | Verificación de métricas (tiempo, ROI) | 2 |
| Benchmarks | Tests de rendimiento | 6 |

#### Shop Service (16 tests)
| Categoría | Descripción | Cantidad |
|-----------|-------------|----------|
| CRUD Operations | Create, Read, Update, Delete | 8 |
| List & Pagination | Listado con filtros y paginación | 2 |
| Measures | Aplicar y eliminar medidas | 3 |
| Risk Assessment | Evaluación de riesgos | 2 |
| Benchmarks | Tests de rendimiento | 3 |

## 🔧 Tests de Integración (Bash)

### Ejecutar Script
```bash
# Asegurarse de que el servidor está corriendo
cd /home/david/climate-invest-optimizer/backend
go run cmd/api/main.go &

# Ejecutar tests de integración
chmod +x tests/optimization/run_optimization_tests.sh
./tests/optimization/run_optimization_tests.sh
```

### Categorías de Tests Bash (24+ tests)
| Parte | Descripción |
|-------|-------------|
| 1 | Tests básicos (greedy, knapsack, weighted) |
| 2 | Tests con múltiples tiendas |
| 3 | Tests de validación (errores esperados) |
| 4 | Tests de casos límite |
| 5 | Tests con prioridades de riesgos |
| 6 | Tests de presupuestos exactos |
| 7 | Tests de distribución multi-tienda |
| 8 | Tests de estrés |
| 9 | Comparación de algoritmos |
| 10 | Tests de rendimiento |

## 📊 Benchmarks

### Resultados Típicos (AMD Ryzen 7 5800X3D)

| Benchmark | ns/op | B/op | allocs/op |
|-----------|-------|------|-----------|
| Greedy_SingleShop | ~21,000 | 29,688 | 260 |
| Greedy_MultipleShops | ~100,000 | 135,905 | 1,211 |
| Knapsack_SingleShop | ~24,000 | 34,320 | 272 |
| Knapsack_MultipleShops | ~132,000 | 174,889 | 1,275 |
| Weighted_SingleShop | ~21,500 | 29,688 | 260 |
| Weighted_MultipleShops | ~141,000 | 132,032 | 1,197 |

## 🎯 Cobertura de Tests

Los tests cubren:

### Algoritmos
- ✅ **Greedy**: Selección por ratio costo-beneficio
- ✅ **Knapsack**: Programación dinámica 0/1
- ✅ **Weighted**: Con prioridades de riesgos

### Casos de Uso
- ✅ Una tienda con presupuesto pequeño/medio/grande
- ✅ Múltiples tiendas (2-5+)
- ✅ Con y sin prioridades de riesgos
- ✅ Presupuesto exacto para N medidas
- ✅ Presupuesto insuficiente
- ✅ Presupuesto muy grande (€10M)

### Validaciones
- ✅ Tienda inexistente
- ✅ Presupuesto negativo
- ✅ Lista de tiendas vacía
- ✅ Estrategia por defecto

### Métricas
- ✅ Tiempo de procesamiento < 1s
- ✅ ROI positivo
- ✅ Utilización del presupuesto > 80%
- ✅ Presupuesto restante = Budget - TotalCost

## 🚀 Ejecutar Todo

```bash
# Tests completos
cd /home/david/climate-invest-optimizer/backend

# 1. Tests unitarios
go test ./tests/... -v

# 2. Benchmarks
go test ./tests/... -bench=. -benchmem

# 3. Iniciar servidor
go run cmd/api/main.go &

# 4. Tests de integración
./tests/optimization/run_optimization_tests.sh

# 5. Cobertura
go test ./tests/... -coverprofile=coverage.out
go tool cover -func=coverage.out
```

## ✅ Resultado Esperado

```
=== Tests Unitarios ===
ok  tests/optimization  0.009s (30 tests)
ok  tests/services      0.005s (16 tests)

=== Benchmarks ===
BenchmarkGreedy_SingleShop-14         57378    21088 ns/op
BenchmarkKnapsack_SingleShop-14       50824    23878 ns/op
...

=== Tests de Integración ===
✓ Tests pasados: 24
✗ Tests fallidos: 0
🎉 ¡Todos los tests pasaron correctamente!
```
