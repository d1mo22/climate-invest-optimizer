## 🧩 **Fase 1: Preparación del entorno**

**Objetivo:** Tener el backend de Go listo para desarrollar.

1. Crear carpeta `backend/` (ya la tienes).
2. Inicializar el módulo:

   ```bash
   go mod init mango-backend
   go mod tidy
   ```
3. Instalar librerías básicas:

   ```bash
   go get github.com/gin-gonic/gin        # framework HTTP
   go get github.com/joho/godotenv        # para variables de entorno
   go get gorm.io/gorm                    # ORM
   go get gorm.io/driver/sqlite           # o postgres/mysql más adelante
   ```
4. Crear estructura de carpetas:

   ```
   backend/
   ├── main.go
   ├── config/
   │   └── db.go
   ├── models/
   ├── controllers/
   ├── routes/
   └── strategies/
   ```

---

## 🧱 **Fase 2: Modelado de entidades**

**Objetivo:** Traducir tu UML a estructuras `struct` en Go.

* Crear un archivo por modelo dentro de `/models/`.
* Ejemplo (para Botiga):

  ```go
  type Botiga struct {
      ID                uint      `gorm:"primaryKey"`
      Name              string
      Location          string
      Coordinates       [2]float64
      TotalRisk         float64
      TaxonomyCoverage  float64
      Surface           float64
      CarbonFootprint   float64
      ClusterID         uint
      CountryID         uint
      Measures          []Mesura
  }
  ```

Repite algo similar para `Cluster`, `Risc`, `RiscCluster`, `Mesura`, `Pais`.

---

## ⚙️ **Fase 3: API base**

**Objetivo:** Crear las rutas CRUD básicas.
Ejemplo de estructura de rutas:

```
GET    /botigues              -> lista todas las tiendas
GET    /botigues/:id          -> obtiene una tienda
POST   /botigues              -> crea una tienda
PUT    /botigues/:id          -> actualiza
DELETE /botigues/:id          -> elimina
```

Empieza con `Botiga`, `Cluster` y `Risc`.

---

## 🧠 **Fase 4: Implementar el patrón Strategy**

**Objetivo:** Calcular la inversión con diferentes estrategias (1 año / 10 años).

1. Crear interfaz `InversioStrategy`:

   ```go
   type InversioStrategy interface {
       CalcularInversio(b Botiga) float64
   }
   ```
2. Crear implementaciones concretas:

   * `OneYearStrategy`
   * `TenYearStrategy`
3. Crear un servicio que reciba la estrategia seleccionada y devuelva los resultados.

---

## 📊 **Fase 5: Cálculo de riesgos y medidas**

**Objetivo:** Relacionar `Botiga`, `RiscCluster` y `Mesura` para obtener métricas.

* Implementar una función que calcule la prioridad de inversión por tienda.
* Usar las relaciones del UML para ponderar intensidad, probabilidad, y coste de medidas.

---

## 🧪 **Fase 6: Tests y simulaciones**

**Objetivo:** Validar la lógica.

* Pruebas unitarias de las estrategias.
* Endpoint `/simulate` que ejecute una inversión con un presupuesto dado.

---

## ☁️ **Fase 7: Integración futura (IA o predicciones)**

**Objetivo:** Dejar preparado un endpoint que acepte predicciones externas.

* Endpoint `/predict` (placeholder) que luego se conectará con un microservicio Python.

---

## 🗺️ **Resultado esperado**

Al final tendrás:

* Una **API REST en Go** que gestiona tiendas, riesgos y medidas.
* Un **módulo de cálculo** extensible con estrategias de inversión.
* Una **base sólida** para conectar el frontend y añadir IA más adelante.
