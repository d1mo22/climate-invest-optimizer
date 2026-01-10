# Integración Frontend-Backend

## ✅ Completado

### 1. Configuración Base
- ✅ Creados archivos `.env` y `.env.example`
- ✅ Creado archivo de configuración `src/config/api.ts`
- ✅ Creado cliente API base `src/services/apiClient.ts`

### 2. Servicios API
Se han creado los siguientes servicios para comunicarse con el backend:

- ✅ **shopService.ts** - Gestión de tiendas (shops)
- ✅ **clusterService.ts** - Gestión de clusters
- ✅ **riskService.ts** - Gestión de riesgos
- ✅ **measureService.ts** - Gestión de medidas
- ✅ **optimizationService.ts** - Optimización de presupuesto
- ✅ **dashboardService.ts** - Datos del dashboard

### 3. Actualización de Contextos
- ✅ Actualizado `StoresContext.tsx` para cargar datos del backend
- ✅ Actualizado `types/index.ts` con nuevos tipos

### 4. Ejemplo de Página Conectada
- ✅ Creado `DashBoardsNew.tsx` como ejemplo de página conectada al backend

## 🔄 Próximos Pasos

### 1. Iniciar el Backend
Primero, asegúrate de que el backend esté corriendo:

\`\`\`bash
cd backend
# Configurar .env con las credenciales de la base de datos
go run cmd/api/main.go
\`\`\`

El backend debería estar disponible en `http://localhost:8080`

### 2. Configurar el Frontend
Actualiza el archivo `.env` en la carpeta `frontend`:

\`\`\`env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_DEBUG=true
\`\`\`

### 3. Instalar Dependencias (si es necesario)
Si no tienes Ant Design instalado:

\`\`\`bash
cd frontend
npm install antd @ant-design/pro-components @ant-design/plots
\`\`\`

### 4. Actualizar Páginas Existentes

#### Opción A: Reemplazar páginas existentes
Puedes reemplazar las páginas existentes con las nuevas versiones:

\`\`\`bash
# Backup de las páginas originales
mv src/pages/DashBoards.tsx src/pages/DashBoards.tsx.backup

# Usar la nueva versión
mv src/pages/DashBoardsNew.tsx src/pages/DashBoards.tsx
\`\`\`

#### Opción B: Actualizar manualmente
Puedes actualizar las páginas existentes siguiendo el patrón de `DashBoardsNew.tsx`:

1. **Importar servicios:**
   \`\`\`typescript
   import { shopService, clusterService, dashboardService } from "../services";
   \`\`\`

2. **Agregar estado para carga:**
   \`\`\`typescript
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [data, setData] = useState<YourDataType[]>([]);
   \`\`\`

3. **Cargar datos en useEffect:**
   \`\`\`typescript
   useEffect(() => {
     const loadData = async () => {
       try {
         setLoading(true);
         const response = await shopService.getShops({ limit: 1000 });
         setData(response.data);
       } catch (err) {
         setError(err.message);
       } finally {
         setLoading(false);
       }
     };
     loadData();
   }, []);
   \`\`\`

### 5. Páginas a Actualizar

#### CountryDashboard.tsx
Necesita cargar datos de país específico:

\`\`\`typescript
import { dashboardService } from "../services";

// En useEffect:
const data = await dashboardService.getCountryDashboard(countrySlug);
\`\`\`

#### StoreDashboard.tsx
Necesita cargar datos de tienda específica:

\`\`\`typescript
import { shopService } from "../services";

// En useEffect:
const shop = await shopService.getShopById(shopId);
const measures = await shopService.getShopMeasures(shopId);
const riskAssessment = await shopService.getRiskAssessment(shopId);
\`\`\`

### 6. Habilitar CORS en el Backend

Asegúrate de que el backend tenga CORS configurado correctamente para permitir peticiones desde `http://localhost:5173`:

En el archivo backend `.env`:
\`\`\`env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
\`\`\`

### 7. Probar la Integración

1. Inicia el backend:
   \`\`\`bash
   cd backend
   go run cmd/api/main.go
   \`\`\`

2. Inicia el frontend:
   \`\`\`bash
   cd frontend
   npm run dev
   \`\`\`

3. Abre el navegador en `http://localhost:5173`

4. Abre las Developer Tools (F12) y verifica:
   - Console: No debe haber errores de CORS
   - Network: Deberías ver llamadas a `http://localhost:8080/api/v1/*`

## 📚 Uso de los Servicios

### Ejemplo: Obtener todas las tiendas
\`\`\`typescript
import { shopService } from "../services";

const shops = await shopService.getShops({ 
  page: 1, 
  limit: 50,
  country: "España" 
});

console.log(shops.data); // Array de tiendas
console.log(shops.total); // Total de tiendas
\`\`\`

### Ejemplo: Obtener riesgos de una tienda
\`\`\`typescript
import { shopService } from "../services";

const riskAssessment = await shopService.getRiskAssessment(shopId);
console.log(riskAssessment.risks);
\`\`\`

### Ejemplo: Optimizar presupuesto
\`\`\`typescript
import { optimizationService } from "../services";

const result = await optimizationService.optimizeBudget({
  budget: 100000,
  priorityWeights: {
    riskReduction: 0.5,
    roi: 0.3,
    carbonReduction: 0.2
  }
});

console.log(result.recommendations);
\`\`\`

## 🔧 Manejo de Errores

El cliente API incluye manejo de errores automático:

\`\`\`typescript
try {
  const shops = await shopService.getShops();
  setData(shops.data);
} catch (error) {
  if (error instanceof ApiError) {
    // Error de API con status code
    console.error(\`Error \${error.status}: \${error.message}\`);
    setError(error.message);
  } else {
    // Error de red u otro
    console.error("Error desconocido:", error);
    setError("Error de conexión con el servidor");
  }
}
\`\`\`

## 🎯 Estados de Carga

Todas las páginas deben manejar 3 estados:

1. **Loading**: Mostrando spinner
2. **Error**: Mostrando mensaje de error
3. **Success**: Mostrando datos

Ejemplo:
\`\`\`typescript
if (loading) {
  return <Spin size="large" />;
}

if (error) {
  return <Alert message="Error" description={error} type="error" />;
}

return <div>{/* Renderizar datos */}</div>;
\`\`\`

## 🔐 Autenticación (Futuro)

Si necesitas implementar autenticación:

1. El token se guarda automáticamente en localStorage
2. Se incluye automáticamente en todas las peticiones
3. Para hacer login:

\`\`\`typescript
import { apiClient } from "../services/apiClient";

const response = await apiClient.post("/auth/login", {
  email: "user@example.com",
  password: "password"
});

// El token se guarda automáticamente
localStorage.setItem("authToken", response.token);
\`\`\`

## 📊 Dashboard Endpoints

El backend necesita implementar estos endpoints para el dashboard completo:

- \`GET /api/v1/dashboard/summary\` - Resumen global
- \`GET /api/v1/dashboard/countries/:country\` - Datos por país

Si estos endpoints no existen aún, puedes:
1. Agregarlos al backend
2. O construir los datos en el frontend agregando la información de las tiendas

## 🐛 Troubleshooting

### Error de CORS
Si ves errores de CORS en la consola:
1. Verifica que el backend esté configurado con ALLOWED_ORIGINS correcto
2. Reinicia el backend después de cambiar el .env

### Error de conexión
Si no puedes conectar al backend:
1. Verifica que el backend esté corriendo en el puerto 8080
2. Verifica la URL en el archivo `.env` del frontend
3. Prueba acceder directamente: `http://localhost:8080/api/v1/shops`

### Datos no aparecen
Si el componente se renderiza pero no muestra datos:
1. Abre las Developer Tools > Network
2. Verifica que las peticiones se estén haciendo
3. Verifica la respuesta del servidor
4. Verifica que el formato de datos coincida con los tipos TypeScript

## 📝 Notas Adicionales

- Los CSV en \`/public/data/\` ya no son necesarios una vez que la integración esté completa
- El contexto \`StoresContext\` ahora carga datos del backend automáticamente
- Puedes mantener los CSV como fallback si lo deseas
- El modo debug (\`VITE_DEBUG=true\`) loguea todas las peticiones API en la consola
