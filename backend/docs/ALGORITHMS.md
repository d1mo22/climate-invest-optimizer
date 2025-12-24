# 🧠 Algoritmos de Optimización de Presupuesto

Este documento explica en detalle las heurísticas y algoritmos utilizados para optimizar la distribución de presupuesto en medidas de mitigación de riesgos climáticos.

## 📋 Índice

1. [Visión General](#visión-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Algoritmo Greedy](#1-algoritmo-greedy)
4. [Algoritmo Knapsack](#2-algoritmo-knapsack-01)
5. [Algoritmo Weighted](#3-algoritmo-weighted)
6. [Cálculo de Métricas](#cálculo-de-métricas)
7. [Comparación de Algoritmos](#comparación-de-algoritmos)

---

## Visión General

El sistema de optimización selecciona qué medidas de mitigación aplicar a cada tienda dado un presupuesto máximo. El objetivo es **maximizar la reducción de riesgo** respetando la restricción presupuestaria.

### Flujo del Proceso

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA                                      │
│  • Lista de tiendas (shop_ids)                                  │
│  • Presupuesto máximo (max_budget)                              │
│  • Estrategia (greedy/knapsack/weighted)                        │
│  • Prioridades de riesgos opcionales                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              1. CONSTRUCCIÓN DE CANDIDATOS                      │
│  Para cada tienda:                                              │
│    • Obtener medidas no aplicadas                               │
│    • Calcular reducción de riesgo estimada                      │
│    • Calcular eficiencia = reducción / costo                    │
│    • Determinar prioridad                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              2. SELECCIÓN (según estrategia)                    │
│  • Greedy: Ordenar por eficiencia, seleccionar en orden         │
│  • Knapsack: Programación dinámica óptima                       │
│  • Weighted: Priorizar riesgos específicos                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SALIDA                                       │
│  • Medidas recomendadas por tienda                              │
│  • Costo total y presupuesto restante                           │
│  • Reducción de riesgo total                                    │
│  • Métricas (ROI, utilización, tiempo)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### Candidato de Medida

Cada combinación (tienda, medida) genera un candidato:

```go
type measureCandidate struct {
    Measure       Measure   // La medida a aplicar
    ShopID        int64     // Tienda objetivo
    RiskReduction float64   // Reducción estimada de riesgo
    Efficiency    float64   // RiskReduction / EstimatedCost
    AffectedRisks []string  // Riesgos que mitiga
    Priority      int       // Puntuación de prioridad
}
```

### Estimación de Reducción de Riesgo

La reducción de riesgo se calcula con la siguiente fórmula:

```
Reducción = BaseReduction × (1 + RiesgoActual) × (1 + FactorCosto)
```

Donde:

| Tipo de Medida | BaseReduction |
|----------------|---------------|
| **Material** (ej: aislamiento, impermeabilización) | 10% |
| **Natural** (ej: jardín de lluvia, cubierta vegetal) | 5% |
| **Inmaterial** (ej: plan emergencia, sistemas alerta) | 3% |

El **FactorCosto** ajusta según la inversión:
```
FactorCosto = 1 / (1 + Costo/10000)
```

Esto favorece medidas más baratas con igual reducción base.

---

## 1. Algoritmo Greedy

### Concepto

El algoritmo **Greedy** (voraz) selecciona iterativamente la mejor opción disponible en cada paso, sin reconsiderar decisiones anteriores.

### Heurística

> *"Seleccionar siempre la medida con mejor ratio reducción/costo que quepa en el presupuesto restante"*

### Pseudocódigo

```
GREEDY(candidatos, presupuesto):
    ordenar candidatos por eficiencia DESC   // O(n log n)
    seleccionados = []
    restante = presupuesto
    
    para cada candidato en candidatos:       // O(n)
        si candidato.costo ≤ restante:
            si no está duplicado(candidato, tienda):
                seleccionados.añadir(candidato)
                restante -= candidato.costo
        
        si restante ≤ 0:
            break
    
    retornar seleccionados
```

### Ejemplo Visual

```
Presupuesto: €10,000

Candidatos ordenados por eficiencia:
┌─────────────────────────────┬────────┬───────────┬─────────────┐
│ Medida                      │ Costo  │ Reducción │ Eficiencia  │
├─────────────────────────────┼────────┼───────────┼─────────────┤
│ Revisión sistemas pluviales │ €400   │ 0.15      │ 0.000375    │ ← Seleccionar ✓
│ Plan emergencia             │ €800   │ 0.08      │ 0.000100    │ ← Seleccionar ✓
│ Deshumidificador            │ €800   │ 0.07      │ 0.000088    │ ← Seleccionar ✓
│ BMS                         │ €1,000 │ 0.06      │ 0.000060    │ ← Seleccionar ✓
│ Aislamiento térmico         │ €1,500 │ 0.08      │ 0.000053    │ ← Seleccionar ✓
│ Sectorización incendios     │ €3,000 │ 0.12      │ 0.000040    │ ← Seleccionar ✓
│ Barreras inundación         │ €4,000 │ 0.10      │ 0.000025    │ ✗ (excede €2,500)
│ ...                         │        │           │             │
└─────────────────────────────┴────────┴───────────┴─────────────┘

Total seleccionado: €7,500
Restante: €2,500
```

### Características

| Aspecto | Valor |
|---------|-------|
| **Complejidad Temporal** | O(n log n) |
| **Complejidad Espacial** | O(n) |
| **Optimalidad** | No garantizada |
| **Velocidad** | ⚡ Muy rápida |
| **Casos de uso** | Decisiones rápidas, presupuestos grandes |

### Ventajas y Desventajas

✅ **Ventajas:**
- Muy rápido, ideal para tiempo real
- Resultados intuitivos (las "mejores" medidas primero)
- Fácil de explicar al usuario

❌ **Desventajas:**
- Puede dejar presupuesto sin usar
- No garantiza la solución óptima
- Puede perder combinaciones mejores

---

## 2. Algoritmo Knapsack (0/1)

### Concepto

El **Problema de la Mochila** es un problema clásico de optimización combinatoria. Dado un conjunto de items con peso y valor, maximizar el valor total sin exceder la capacidad.

### Formulación Matemática

```
Maximizar: Σ (valor_i × x_i)
Sujeto a:  Σ (costo_i × x_i) ≤ Presupuesto
           x_i ∈ {0, 1}  (seleccionar o no)
```

### Heurística

> *"Usar programación dinámica para encontrar la combinación óptima que maximice la reducción de riesgo total"*

### Pseudocódigo

```
KNAPSACK(candidatos, presupuesto):
    n = |candidatos|
    W = presupuesto / escala      // Discretizar (€100)
    
    // dp[w] = máxima reducción con presupuesto w
    dp = array[W+1] inicializado a 0
    keep = matriz[n][W+1] de booleanos
    
    para i = 0 hasta n-1:                    // O(n)
        costo = candidatos[i].costo / escala
        valor = candidatos[i].reducción
        
        para w = W hasta costo:              // O(W)
            si dp[w-costo] + valor > dp[w]:
                dp[w] = dp[w-costo] + valor
                keep[i][w] = true
    
    // Reconstruir solución
    seleccionados = []
    w = W
    para i = n-1 hasta 0:
        si keep[i][w]:
            seleccionados.añadir(candidatos[i])
            w -= candidatos[i].costo / escala
    
    retornar seleccionados
```

### Ejemplo Visual

```
Presupuesto: €5,000 (W = 50 unidades de €100)

Tabla DP (simplificada):
┌───────┬────────┬───────┬───────────────────────────────────────┐
│ Item  │ Costo  │ Valor │ dp[w] para w = 0, 10, 20, 30, 40, 50  │
├───────┼────────┼───────┼───────────────────────────────────────┤
│       │        │       │ [0, 0, 0, 0, 0, 0]                    │
│ Med1  │ €400   │ 0.15  │ [0, 0, 0, 0, 0.15, 0.15]              │
│ Med2  │ €800   │ 0.08  │ [0, 0, 0, 0.08, 0.15, 0.23]           │
│ Med3  │ €1000  │ 0.06  │ [0, 0, 0.06, 0.14, 0.21, 0.29]        │
│ Med4  │ €1500  │ 0.08  │ [0, 0.08, 0.14, 0.22, 0.29, 0.37]     │
│ Med5  │ €3000  │ 0.12  │ [0, 0.12, 0.20, 0.26, 0.34, 0.41]     │
└───────┴────────┴───────┴───────────────────────────────────────┘

Solución óptima: {Med1, Med2, Med4, Med5} = €5,700 → ajustar
Reducción total máxima: 0.43
```

### Características

| Aspecto | Valor |
|---------|-------|
| **Complejidad Temporal** | O(n × W) |
| **Complejidad Espacial** | O(n × W) |
| **Optimalidad** | ✅ Garantizada |
| **Velocidad** | Moderada |
| **Casos de uso** | Optimización exacta, presupuestos medianos |

### Ventajas y Desventajas

✅ **Ventajas:**
- Solución **óptima** garantizada
- Maximiza uso del presupuesto
- Considera todas las combinaciones posibles

❌ **Desventajas:**
- Más lento que Greedy
- Mayor uso de memoria
- Discretización puede introducir pequeños errores

---

## 3. Algoritmo Weighted

### Concepto

Una variante del Greedy que **prioriza riesgos específicos** definidos por el usuario, permitiendo personalizar la estrategia de mitigación.

### Heurística

> *"Priorizar medidas que mitiguen los riesgos marcados como críticos, y dentro de esos, seleccionar por eficiencia"*

### Cálculo de Prioridad

```go
prioridad = 0

// Bonus por riesgo prioritario
para cada riesgo en riesgos_tienda:
    si riesgo.ID está en prioridades_usuario:
        prioridad += 10
    
    // Bonus adicional si riesgo es alto
    si riesgo.Score > 0.7:
        prioridad += 5

// Bonus por tipo de medida
según medida.Tipo:
    Material:   prioridad += 3
    Natural:    prioridad += 2
    Inmaterial: prioridad += 0
```

### Pseudocódigo

```
WEIGHTED(candidatos, presupuesto, prioridades):
    si prioridades está vacío:
        retornar GREEDY(candidatos, presupuesto)
    
    // Ordenar: primero por prioridad, luego por eficiencia
    ordenar candidatos por:
        1. prioridad DESC
        2. eficiencia DESC (desempate)
    
    seleccionados = []
    restante = presupuesto
    
    para cada candidato en candidatos:
        si candidato.costo ≤ restante:
            si no está duplicado(candidato, tienda):
                seleccionados.añadir(candidato)
                restante -= candidato.costo
    
    retornar seleccionados
```

### Ejemplo Visual

```
Prioridades del usuario: [1, 2]  // Inundación (1), Ola de calor (2)

Candidatos con prioridad calculada:
┌─────────────────────────────┬────────┬───────────┬───────────┬───────────┐
│ Medida                      │ Costo  │ Eficiencia│ Prioridad │ Riesgos   │
├─────────────────────────────┼────────┼───────────┼───────────┼───────────┤
│ Barreras inundación         │ €4,000 │ 0.000025  │ 23        │ Inundación│ ← Primero
│ Jardín de lluvia            │ €4,400 │ 0.000011  │ 22        │ Inundación│ ← Segundo
│ Aislamiento térmico         │ €1,500 │ 0.000053  │ 18        │ Ola calor │ ← Tercero
│ Revisión sistemas pluviales │ €400   │ 0.000375  │ 13        │ Inundación│ ← Cuarto
│ Sectorización incendios     │ €3,000 │ 0.000040  │ 8         │ Incendio  │ ← Sin prio
└─────────────────────────────┴────────┴───────────┴───────────┴───────────┘

Con presupuesto €10,000:
1. Barreras inundación (€4,000) - prioridad 23 ✓
2. Jardín de lluvia (€4,400) - prioridad 22 ✗ (excede)
3. Aislamiento térmico (€1,500) - prioridad 18 ✓
4. Revisión sistemas pluviales (€400) - prioridad 13 ✓
...
```

### Características

| Aspecto | Valor |
|---------|-------|
| **Complejidad Temporal** | O(n log n) |
| **Complejidad Espacial** | O(n) |
| **Optimalidad** | No garantizada |
| **Velocidad** | ⚡ Muy rápida |
| **Casos de uso** | Personalización, riesgos críticos |

### Ventajas y Desventajas

✅ **Ventajas:**
- Permite **personalización** del usuario
- Enfoca recursos en lo más crítico
- Tan rápido como Greedy

❌ **Desventajas:**
- Puede ignorar medidas muy eficientes
- Depende de buena selección de prioridades
- No garantiza solución óptima

---

## Cálculo de Métricas

### Utilización del Presupuesto
```
Utilización (%) = (Costo Total / Presupuesto) × 100
```

### Reducción de Riesgo Promedio
```
Reducción Promedio = (Σ Reducciones) / Número de Medidas
```

### ROI Estimado
```
ROI = Reducción Total × 5
```
*Factor 5 asume que cada punto de reducción genera 5x el valor de la inversión en daños evitados.*

### Tiempo de Procesamiento
Medido en milisegundos desde el inicio hasta la construcción del resultado.

---

## Comparación de Algoritmos

### Tabla Comparativa

| Característica | Greedy | Knapsack | Weighted |
|----------------|--------|----------|----------|
| **Complejidad** | O(n log n) | O(n × W) | O(n log n) |
| **Optimalidad** | ❌ | ✅ | ❌ |
| **Velocidad** | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡ |
| **Personalización** | ❌ | ❌ | ✅ |
| **Uso memoria** | Bajo | Alto | Bajo |
| **Utilización presupuesto** | Media | Alta | Media |

### Cuándo Usar Cada Algoritmo

```
┌─────────────────────────────────────────────────────────────────┐
│                    ¿QUÉ ALGORITMO USAR?                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ¿Necesitas solución óptima garantizada?                        │
│      │                                                          │
│      ├── SÍ → KNAPSACK                                          │
│      │                                                          │
│      └── NO → ¿Tienes riesgos prioritarios?                     │
│                  │                                              │
│                  ├── SÍ → WEIGHTED                              │
│                  │                                              │
│                  └── NO → GREEDY                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Rendimiento Típico

| Benchmark | Greedy | Knapsack | Weighted |
|-----------|--------|----------|----------|
| 1 tienda, €20k | ~21 μs | ~24 μs | ~21 μs |
| 5 tiendas, €50k | ~100 μs | ~132 μs | ~141 μs |
| Memoria | ~30 KB | ~35 KB | ~30 KB |

---

## Ejemplos de Uso

### API Request

```bash
# Greedy (rápido, bueno para decisiones generales)
curl -X POST /api/v1/optimization/budget \
  -d '{"shop_ids": [1, 2], "max_budget": 25000, "strategy": "greedy"}'

# Knapsack (óptimo, mejor utilización)
curl -X POST /api/v1/optimization/budget \
  -d '{"shop_ids": [1, 2], "max_budget": 25000, "strategy": "knapsack"}'

# Weighted (personalizado por prioridades)
curl -X POST /api/v1/optimization/budget \
  -d '{"shop_ids": [1, 2], "max_budget": 25000, "strategy": "weighted", "risk_priorities": [1, 2]}'
```

### Interpretación de Resultados

```json
{
  "total_cost": 23500,
  "remaining_budget": 1500,
  "total_risk_reduction": 45.2,
  "strategy_used": "greedy",
  "metrics": {
    "budget_utilization_percentage": 94.0,
    "average_risk_reduction": 5.65,
    "estimated_roi": 2.26,
    "processing_time_ms": 3
  }
}
```

| Métrica | Interpretación |
|---------|----------------|
| `budget_utilization` 94% | Excelente uso del presupuesto |
| `average_risk_reduction` 5.65% | Cada medida reduce ~5.65% de riesgo |
| `estimated_roi` 2.26 | Por cada €1 invertido, se evitan €2.26 en daños |
| `processing_time` 3ms | Respuesta instantánea |

---

## Referencias

- Cormen, T. H., et al. "Introduction to Algorithms" - Capítulo sobre Greedy Algorithms
- Kellerer, H., et al. "Knapsack Problems" - Springer
- [Wikipedia: Knapsack Problem](https://en.wikipedia.org/wiki/Knapsack_problem)
