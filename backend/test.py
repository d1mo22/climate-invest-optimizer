import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from geopy.distance import geodesic
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable

# --- Configuración ---
ARCHIVO_ENTRADA = 'tiendas_mango_v2.csv'
ARCHIVO_SALIDA = 'tiendas_mango_final.csv'

# Coordenadas de los Hubs principales
CIUDADES_MAYORES = {
    "Madrid": (40.416775, -3.703790),
    "Barcelona": (41.385064, 2.173404),
    "Valencia": (39.469907, -0.376288),
    "Sevilla": (37.389092, -5.984459),
    "Bilbao": (43.263013, -2.934985),
    "Málaga": (36.721274, -4.421399),
    "Zaragoza": (41.648823, -0.889085),
    "Santiago": (42.878213, -8.544844),
    "Palma": (39.569600, 2.650160),
    "Canarias": (28.123546, -15.436257)
}


def obtener_hub_cercano(lat, lon):
    if pd.isna(lat) or pd.isna(lon):
        return "Desconocido"
    origen = (lat, lon)
    mejor_ciudad, mejor_dist = None, float('inf')

    for ciudad, coords in CIUDADES_MAYORES.items():
        try:
            dist = geodesic(origen, coords).km
            if dist < mejor_dist:
                mejor_dist = dist
                mejor_ciudad = ciudad
        except:
            continue
    return mejor_ciudad


def estimar_superficie_real(row):
    # Lógica basada en el número de colecciones (Scraping V2)
    colecciones = str(row.get('Colecciones', '')).split('+')
    n_colecciones = len(colecciones)

    if n_colecciones >= 4:
        return "Muy Grande (>1000m² - Flagship)"
    elif n_colecciones == 3:
        return "Grande (~600-800m²)"
    elif n_colecciones == 2:
        return "Mediana (~400m²)"
    else:  # Solo 1 colección o datos antiguos
        return "Estándar (~250-300m²)"


# --- Ejecución ---
try:
    print("1. Cargando datos...")
    df = pd.read_csv(ARCHIVO_ENTRADA)

    # IMPORTANTE: Aumentamos timeout a 10s y cambiamos el user_agent
    geolocator = Nominatim(
        user_agent="app_tiendas_mango_analisis_v2", timeout=10)

    # RateLimiter para no ser baneados (1.5s entre peticiones)
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.5)

    print("2. Obteniendo coordenadas (Paciencia, tardará unos minutos)...")

    latitudes = []
    longitudes = []

    for index, row in df.iterrows():
        query = f"{row['Dirección']}, {row['Ciudad y CP']}, España"
        try:
            # Intentamos geocodificar
            location = geocode(query)
            if not location:
                # Si falla, intento secundario solo con ciudad
                location = geocode(f"{row['Ciudad y CP']}, España")

            if location:
                latitudes.append(location.latitude)
                longitudes.append(location.longitude)
                print(f"   [OK] {row['Ciudad y CP']}")
            else:
                latitudes.append(None)
                longitudes.append(None)
                print(f"   [!!] No encontrada: {query}")

        except (GeocoderTimedOut, GeocoderUnavailable):
            print(
                f"   [TimeOut] Error de conexión en fila {index}. Saltando...")
            latitudes.append(None)
            longitudes.append(None)

    df['Latitud'] = latitudes
    df['Longitud'] = longitudes

    print("3. Calculando metadatos (Hubs y Superficie)...")
    df['Hub_Logístico'] = df.apply(lambda row: obtener_hub_cercano(
        row['Latitud'], row['Longitud']), axis=1)
    df['Superficie_Est'] = df.apply(estimar_superficie_real, axis=1)

    df.to_csv(ARCHIVO_SALIDA, index=False, encoding='utf-8-sig')
    print(f"¡Éxito! Archivo guardado como: {ARCHIVO_SALIDA}")

except FileNotFoundError:
    print(
        f"Error: No encuentro el archivo '{ARCHIVO_ENTRADA}'. Ejecuta primero el script de JS en el navegador.")
except Exception as e:
    print(f"Error inesperado: {e}")
