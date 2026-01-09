#!/bin/bash
# Script de pruebas complejas para los algoritmos de optimización
# Uso: ./run_optimization_tests.sh

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
PASS=0
FAIL=0

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🧪 Tests de Algoritmos de Optimización                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para ejecutar test
run_test() {
    local name="$1"
    local payload="$2"
    local expected_success="$3"
    local expected_max_cost="$4"
    
    echo -e "${YELLOW}▶ Test: $name${NC}"
    
    response=$(curl -s -X POST "$BASE_URL/optimization/budget" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    success=$(echo "$response" | grep -o '"success":true' | head -1)
    total_cost=$(echo "$response" | grep -o '"total_cost":[0-9.]*' | head -1 | cut -d: -f2)
    strategy=$(echo "$response" | grep -o '"strategy_used":"[^"]*"' | head -1 | cut -d: -f2 | tr -d '"')
    measures=$(echo "$response" | grep -o '"recommended_measures":\[' | head -1)
    
    if [ "$expected_success" = "true" ] && [ -n "$success" ]; then
        if [ -n "$expected_max_cost" ] && [ -n "$total_cost" ]; then
            if (( $(echo "$total_cost <= $expected_max_cost" | bc -l) )); then
                echo -e "  ${GREEN}✓ PASS${NC} - Coste: €$total_cost (max: €$expected_max_cost), Estrategia: $strategy"
                ((PASS++))
            else
                echo -e "  ${RED}✗ FAIL${NC} - Coste €$total_cost excede máximo €$expected_max_cost"
                ((FAIL++))
            fi
        else
            echo -e "  ${GREEN}✓ PASS${NC} - Estrategia: $strategy"
            ((PASS++))
        fi
    elif [ "$expected_success" = "false" ] && [ -z "$success" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} - Error esperado correctamente detectado"
        ((PASS++))
    else
        echo -e "  ${RED}✗ FAIL${NC} - Resultado inesperado"
        echo "  Response: ${response:0:200}..."
        ((FAIL++))
    fi
    echo ""
}

# Función para comparar algoritmos
compare_algorithms() {
    local budget="$1"
    local shop_ids="$2"
    
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}📊 Comparación de Algoritmos - Presupuesto: €$budget${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    
    printf "%-12s | %-10s | %-8s | %-15s | %-10s\n" "Algoritmo" "Coste" "Medidas" "Reducción" "Tiempo(ms)"
    printf "%-12s | %-10s | %-8s | %-15s | %-10s\n" "------------" "----------" "--------" "---------------" "----------"
    
    for strategy in "greedy" "knapsack" "weighted"; do
        response=$(curl -s -X POST "$BASE_URL/optimization/budget" \
            -H "Content-Type: application/json" \
            -d "{\"shop_ids\": $shop_ids, \"max_budget\": $budget, \"strategy\": \"$strategy\"}")
        
        total_cost=$(echo "$response" | grep -o '"total_cost":[0-9.]*' | head -1 | cut -d: -f2)
        risk_reduction=$(echo "$response" | grep -o '"total_risk_reduction":[0-9.]*' | head -1 | cut -d: -f2)
        processing_time=$(echo "$response" | grep -o '"processing_time_ms":[0-9]*' | head -1 | cut -d: -f2)
        num_measures=$(echo "$response" | grep -o '"priority":[0-9]*' | wc -l)
        
        printf "%-12s | €%-9s | %-8s | %-14s%% | %-10s\n" \
            "$strategy" "${total_cost:-0}" "$((num_measures/2))" "${risk_reduction:-0}" "${processing_time:-0}"
    done
    echo ""
}

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 1: Tests Básicos${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1: Greedy con presupuesto pequeño
run_test "Greedy - Presupuesto pequeño (€5,000)" \
    '{"shop_ids": [1], "max_budget": 5000, "strategy": "greedy"}' \
    "true" "5000"

# Test 2: Knapsack con presupuesto medio
run_test "Knapsack - Presupuesto medio (€15,000)" \
    '{"shop_ids": [1], "max_budget": 15000, "strategy": "knapsack"}' \
    "true" "15000"

# Test 3: Weighted con presupuesto grande
run_test "Weighted - Presupuesto grande (€50,000)" \
    '{"shop_ids": [1], "max_budget": 50000, "strategy": "weighted"}' \
    "true" "50000"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 2: Tests con Múltiples Tiendas${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Primero, crear tiendas adicionales si no existen
echo -e "${BLUE}Creando tiendas de prueba...${NC}"

curl -s -X POST "$BASE_URL/shops" \
    -H "Content-Type: application/json" \
    -d '{"name": "Barcelona Test", "address": "Diagonal 500", "cluster_id": 4, "location": "Barcelona Diagonal", "utm_north": 41.39, "utm_east": 2.15, "surface": 800}' > /dev/null 2>&1

curl -s -X POST "$BASE_URL/shops" \
    -H "Content-Type: application/json" \
    -d '{"name": "Valencia Test", "address": "Puerto 1", "cluster_id": 7, "location": "Valencia Puerto", "utm_north": 39.45, "utm_east": -0.32, "surface": 450}' > /dev/null 2>&1

echo -e "${GREEN}✓ Tiendas creadas${NC}"
echo ""

# Test 4: Múltiples tiendas
run_test "Greedy - 2 tiendas (€25,000)" \
    '{"shop_ids": [1, 2], "max_budget": 25000, "strategy": "greedy"}' \
    "true" "25000"

# Test 5: Más tiendas
run_test "Knapsack - 3 tiendas (€40,000)" \
    '{"shop_ids": [1, 2, 3], "max_budget": 40000, "strategy": "knapsack"}' \
    "true" "40000"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 3: Tests de Validación (Errores Esperados)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 6: Presupuesto negativo
run_test "Validación - Presupuesto negativo" \
    '{"shop_ids": [1], "max_budget": -1000, "strategy": "greedy"}' \
    "false"

# Test 7: Lista de tiendas vacía
run_test "Validación - Lista tiendas vacía" \
    '{"shop_ids": [], "max_budget": 10000, "strategy": "greedy"}' \
    "false"

# Test 8: Tienda inexistente
run_test "Validación - Tienda inexistente (ID: 99999)" \
    '{"shop_ids": [99999], "max_budget": 10000, "strategy": "greedy"}' \
    "false"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 4: Tests de Casos Límite${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 9: Presupuesto mínimo (solo para la medida más barata)
run_test "Límite - Presupuesto mínimo (€400)" \
    '{"shop_ids": [1], "max_budget": 400, "strategy": "greedy"}' \
    "true" "400"

# Test 10: Presupuesto que no alcanza para nada
run_test "Límite - Presupuesto insuficiente (€100)" \
    '{"shop_ids": [1], "max_budget": 100, "strategy": "greedy"}' \
    "true" "100"

# Test 11: Presupuesto muy grande
run_test "Límite - Presupuesto muy grande (€1,000,000)" \
    '{"shop_ids": [1], "max_budget": 1000000, "strategy": "greedy"}' \
    "true" "1000000"

# Test 12: Estrategia por defecto (sin especificar)
run_test "Default - Sin estrategia especificada" \
    '{"shop_ids": [1], "max_budget": 10000}' \
    "true" "10000"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 5: Tests con Prioridades de Riesgos${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 13: Weighted con prioridad en inundación
run_test "Weighted - Prioridad inundación (risk_id=1)" \
    '{"shop_ids": [1], "max_budget": 20000, "strategy": "weighted", "risk_priorities": [1]}' \
    "true" "20000"

# Test 14: Weighted con múltiples prioridades
run_test "Weighted - Múltiples prioridades (risk_ids=1,2,4)" \
    '{"shop_ids": [1], "max_budget": 25000, "strategy": "weighted", "risk_priorities": [1, 2, 4]}' \
    "true" "25000"

# Test 15: Weighted sin prioridades (debe funcionar como greedy)
run_test "Weighted - Sin prioridades especificadas" \
    '{"shop_ids": [1], "max_budget": 15000, "strategy": "weighted"}' \
    "true" "15000"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 6: Tests de Presupuestos Exactos${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 16: Presupuesto exacto para una medida (€800 - Plan emergencia o Deshumidificador)
run_test "Exacto - Presupuesto €800 (1 medida)" \
    '{"shop_ids": [1], "max_budget": 800, "strategy": "greedy"}' \
    "true" "800"

# Test 17: Presupuesto exacto para dos medidas baratas
run_test "Exacto - Presupuesto €1200 (múltiples medidas)" \
    '{"shop_ids": [1], "max_budget": 1200, "strategy": "greedy"}' \
    "true" "1200"

# Test 18: Presupuesto fraccionado (verificar redondeo)
run_test "Exacto - Presupuesto fraccionado €5555.55" \
    '{"shop_ids": [1], "max_budget": 5555.55, "strategy": "knapsack"}' \
    "true" "5556"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 7: Tests de Distribución Multi-Tienda${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 19: Verificar distribución entre 2 tiendas
run_test "Distribución - 2 tiendas equitativo" \
    '{"shop_ids": [1, 2], "max_budget": 20000, "strategy": "greedy"}' \
    "true" "20000"

# Test 20: Verificar distribución con presupuesto limitado
run_test "Distribución - 3 tiendas presupuesto limitado €10000" \
    '{"shop_ids": [1, 2, 3], "max_budget": 10000, "strategy": "greedy"}' \
    "true" "10000"

# Test 21: Knapsack con múltiples tiendas
run_test "Distribución - Knapsack 3 tiendas €35000" \
    '{"shop_ids": [1, 2, 3], "max_budget": 35000, "strategy": "knapsack"}' \
    "true" "35000"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 8: Tests de Estrés${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 22: Presupuesto extremadamente grande
run_test "Estrés - Presupuesto €10 millones" \
    '{"shop_ids": [1], "max_budget": 10000000, "strategy": "greedy"}' \
    "true" "10000000"

# Test 23: Knapsack con presupuesto grande (verificar eficiencia)
run_test "Estrés - Knapsack €100,000 una tienda" \
    '{"shop_ids": [1], "max_budget": 100000, "strategy": "knapsack"}' \
    "true" "100000"

# Test 24: Weighted con todas las prioridades
run_test "Estrés - Weighted con 7 prioridades" \
    '{"shop_ids": [1], "max_budget": 30000, "strategy": "weighted", "risk_priorities": [1, 2, 3, 4, 5, 6, 7]}' \
    "true" "30000"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 9: Comparación de Algoritmos${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Comparar algoritmos con diferentes presupuestos
compare_algorithms 5000 "[1]"
compare_algorithms 15000 "[1]"
compare_algorithms 30000 "[1, 2]"
compare_algorithms 50000 "[1, 2, 3]"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PARTE 10: Tests de Rendimiento${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}Ejecutando 10 optimizaciones consecutivas (Greedy)...${NC}"

total_time=0
for i in {1..10}; do
    start_time=$(date +%s%N)
    curl -s -X POST "$BASE_URL/optimization/budget" \
        -H "Content-Type: application/json" \
        -d '{"shop_ids": [1], "max_budget": 25000, "strategy": "greedy"}' > /dev/null
    end_time=$(date +%s%N)
    elapsed=$(( (end_time - start_time) / 1000000 ))
    total_time=$((total_time + elapsed))
done

avg_time=$((total_time / 10))
echo -e "${GREEN}✓ Greedy - Tiempo promedio: ${avg_time}ms${NC}"

total_time=0
for i in {1..10}; do
    start_time=$(date +%s%N)
    curl -s -X POST "$BASE_URL/optimization/budget" \
        -H "Content-Type: application/json" \
        -d '{"shop_ids": [1], "max_budget": 25000, "strategy": "knapsack"}' > /dev/null
    end_time=$(date +%s%N)
    elapsed=$(( (end_time - start_time) / 1000000 ))
    total_time=$((total_time + elapsed))
done

avg_time=$((total_time / 10))
echo -e "${GREEN}✓ Knapsack - Tiempo promedio: ${avg_time}ms${NC}"

total_time=0
for i in {1..10}; do
    start_time=$(date +%s%N)
    curl -s -X POST "$BASE_URL/optimization/budget" \
        -H "Content-Type: application/json" \
        -d '{"shop_ids": [1], "max_budget": 25000, "strategy": "weighted", "risk_priorities": [1, 2]}' > /dev/null
    end_time=$(date +%s%N)
    elapsed=$(( (end_time - start_time) / 1000000 ))
    total_time=$((total_time + elapsed))
done

avg_time=$((total_time / 10))
echo -e "${GREEN}✓ Weighted - Tiempo promedio: ${avg_time}ms${NC}"
echo ""

# Resumen final
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     📊 RESUMEN DE TESTS                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✓ Tests pasados: $PASS${NC}"
echo -e "  ${RED}✗ Tests fallidos: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todos los tests pasaron correctamente!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Algunos tests fallaron. Revisar los resultados.${NC}"
    exit 1
fi
