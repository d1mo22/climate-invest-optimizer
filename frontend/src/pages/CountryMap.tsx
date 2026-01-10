// src/pages/CountryMap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import MapSVG from "../assets/europe.svg?react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useStores, type ParsedStore } from "../context/StoresContext";

/* ===== Utils texto ===== */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (s: string) => normalize(s).replace(/\s+/g, "-");

// Mapeo de nombres de país: inglés <-> español (bidireccional)
const COUNTRY_NAMES: Record<string, string[]> = {
  Spain: ["Spain", "España", "spain", "españa"],
  Germany: ["Germany", "Alemania", "germany", "alemania"],
  France: ["France", "Francia", "france", "francia"],
  Italy: ["Italy", "Italia", "italy", "italia"],
  "United Kingdom": ["United Kingdom", "Reino Unido", "united kingdom", "reino unido"],
  Portugal: ["Portugal", "portugal"],
  Netherlands: ["Netherlands", "Países Bajos", "netherlands", "paises bajos", "países bajos"],
  Belgium: ["Belgium", "Bélgica", "belgium", "belgica", "bélgica"],
  Switzerland: ["Switzerland", "Suiza", "switzerland", "suiza"],
  Austria: ["Austria", "austria"],
  Poland: ["Poland", "Polonia", "poland", "polonia"],
  Greece: ["Greece", "Grecia", "greece", "grecia"],
  Romania: ["Romania", "Rumanía", "romania", "rumania", "rumanía"],
  Croatia: ["Croatia", "Croacia", "croatia", "croacia"],
  Turkey: ["Turkey", "Turquía", "turkey", "turquia", "turquía"],
  Ukraine: ["Ukraine", "Ucrania", "ukraine", "ucrania"],
  Finland: ["Finland", "Finlandia", "finland", "finlandia"],
  Norway: ["Norway", "Noruega", "norway", "noruega"],
  Denmark: ["Denmark", "Dinamarca", "denmark", "dinamarca"],
  Ireland: ["Ireland", "Irlanda", "ireland", "irlanda"],
};

// Función para comparar países ignorando idioma
const countriesMatch = (a: string, b: string): boolean => {
  const aNorm = a.trim().toLowerCase();
  const bNorm = b.trim().toLowerCase();
  if (aNorm === bNorm) return true;

  for (const variants of Object.values(COUNTRY_NAMES)) {
    const lowVariants = variants.map((v) => v.toLowerCase());
    if (lowVariants.includes(aNorm) && lowVariants.includes(bNorm)) {
      return true;
    }
  }
  return false;
};

const ALIAS: Record<string, string> = {
  spain: "España",
  germany: "Alemania",
  france: "Francia",
  italy: "Italia",
  "united-kingdom": "Reino Unido",
  netherlands: "Países Bajos",
  belgium: "Bélgica",
  switzerland: "Suiza",
  austria: "Austria",
  poland: "Polonia",
  czechia: "Chequia",
  "czech-republic": "Chequia",
  slovakia: "Eslovaquia",
  hungary: "Hungría",
  slovenia: "Eslovenia",
  croatia: "Croacia",
  greece: "Grecia",
  romania: "Rumanía",
  bulgaria: "Bulgaria",
  lithuania: "Lituania",
  latvia: "Letonia",
  estonia: "Estonia",
  finland: "Finlandia",
  sweden: "Suecia",
  norway: "Noruega",
  iceland: "Islandia",
  ireland: "Irlanda",
  andorra: "Andorra",
  monaco: "Mónaco",
  "san-marino": "San Marino",
  liechtenstein: "Liechtenstein",
  luxembourg: "Luxemburgo",
  malta: "Malta",
  cyprus: "Chipre",
  albania: "Albania",
  serbia: "Serbia",
  montenegro: "Montenegro",
  "north-macedonia": "Macedonia del Norte",
  macedonia: "Macedonia del Norte",
  "bosnia-and-herzegovina": "Bosnia y Herzegovina",
  bosnia: "Bosnia y Herzegovina",
  kosovo: "Kosovo",
  moldova: "Moldavia",
  ukraine: "Ucrania",
  belarus: "Bielorrusia",
};

/* ===== Utils matriz ===== */
// multiplica DOMMatrix * punto → DOMPoint
const transformPoint = (m: DOMMatrix, p: DOMPoint) =>
  new DOMPoint(p.x * m.a + p.y * m.c + m.e, p.x * m.b + p.y * m.d + m.f);

/* ===== Constantes markers (copiadas de Map.tsx) ===== */

const MARKER_RADIUS_PX = 20; // igual que en Map.tsx

const UTM_ANCHORS: [number, number][] = [
  [-411926.644, 4926301.901], // Madrid
  [295006.669, 4804084.443], // Baleares
  [-14221.956, 6711542.476], // Londres
  [1492237.774, 6894699.801], // Berlín
  [2776129.989, 8437661.782], // Helsinki
  [1391092.885, 5146430.457], // Roma
  [2220267.244, 6457488.29], // Varsovia
];

const SVG_ANCHORS: [number, number][] = [
  [354.050537109375, 564.7141723632812],
  [440.8133239746094, 573.8910522460938],
  [399.1004638671875, 392.0228576660156],
  [559.2778930664062, 371.16644287109375],
  [686.9193115234375, 257.7073974609375],
  [565.9519653320312, 540.520751953125],
  [645.2064208984375, 403.7024841308594],
];

const PIN_VIEWBOX = "0 0 830 1280";
const PIN_GROUP_TRANSFORM = "translate(0,1280) scale(0.1,-0.1)";
const PIN_PATH_D =
  "M3855 12789 c-555 -44 -1043 -176 -1530 -414 -1457 -712 -2370 -2223 " +
  "-2322 -3840 19 -605 152 -1155 406 -1680 109 -225 183 -353 331 -575 65 -96 " +
  "856 -1369 1760 -2827 903 -1459 1646 -2653 1650 -2653 4 0 747 1194 1650 2652 " +
  "904 1459 1695 2732 1760 2828 148 222 222 350 331 575 421 869 520 1869 279 " +
  "2821 -244 958 -822 1795 -1640 2371 -696 491 -1551 759 -2404 752 -94 -1 -216 " +
  "-5 -271 -10z m635 -1764 c440 -80 813 -271 1120 -575 769 -761 825 -1980 130 " +
  "-2812 -335 -402 -817 -663 -1344 -728 -114 -14 -378 -14 -492 0 -853 105 " +
  "-1550 715 -1764 1544 -141 545 -52 1136 243 1613 330 531 862 876 1497 968 " +
  "130 19 481 13 610 -10z";

function getMarkerColor(name: string) {
  if (name === "Campus mango y almacén lliçá") {
    return "transparent";
  }
  return "#4b6bfdff";
}

/* ===== Utils color (rojo -> verde) ===== */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
// t=0 => rojo, t=1 => verde
function redToGreen(t: number) {
  t = clamp01(t);
  const r = lerp(220, 0, t);
  const g = lerp(40, 200, t);
  const b = lerp(60, 80, t);
  return rgbToHex(r, g, b);
}

/* ===== Afinidad N puntos (igual que en Map.tsx) ===== */

function affineFromN(src: [number, number][], dst: [number, number][]) {
  if (src.length !== dst.length) {
    throw new Error("src y dst deben tener la misma longitud");
  }
  const n = src.length;
  if (n < 3) {
    throw new Error("Se necesitan al menos 3 puntos para una afinidad");
  }

  const AtA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const AtbX = [0, 0, 0];
  const AtbY = [0, 0, 0];

  for (let i = 0; i < n; i++) {
    const [E, N] = src[i];
    const [x, y] = dst[i];
    const row = [E, N, 1];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        AtA[r][c] += row[r] * row[c];
      }
    }
    for (let r = 0; r < 3; r++) {
      AtbX[r] += row[r] * x;
      AtbY[r] += row[r] * y;
    }
  }

  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const solve3 = (A: number[][], b: number[]) => {
    const dA = det(A);
    if (Math.abs(dA) < 1e-9) {
      throw new Error("Sistema casi singular; puntos de ancla mal condicionados");
    }
    const repl = (col: number, vec: number[]) =>
      A.map((row, i) => row.map((v, j) => (j === col ? vec[i] : v)));

    const dx = det(repl(0, b)) / dA;
    const dy = det(repl(1, b)) / dA;
    const dz = det(repl(2, b)) / dA;
    return [dx, dy, dz];
  };

  const [a11, a12, a13] = solve3(AtA, AtbX);
  const [a21, a22, a23] = solve3(AtA, AtbY);

  return (E: number, N: number) => ({
    x: a11 * E + a12 * N + a13,
    y: a21 * E + a22 * N + a23,
  });
}

/* ===== Componente ===== */

export default function CountryMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { slug = "" } = useParams<{ slug: string }>();
  const { state } = useLocation() as { state?: { name?: string } };
  
  // Get data from context
  const storesCtx = useStores();

  const [error, setError] = useState<string | null>(null);
  const [refitTick, setRefitTick] = useState(0);

  // Lista de tiendas parseadas disponible para el sidebar
  const [storesList, setStoresList] = useState<ParsedStore[]>([]);

  // inversión por tienda (para orden y display)
  const [invByIdState, setInvByIdState] = useState<Record<string, number>>({});

  // ordenación del sidebar
  const [sortBy, setSortBy] = useState<"inversion_desc" | "name_asc">(
    "inversion_desc"
  );

  // toggles
  const [showRadius, setShowRadius] = useState(false);
  const [showStores, setShowStores] = useState(true);

  // refs
  const radiusCirclesRef = useRef<SVGCircleElement[]>([]);
  const storesRef = useRef<SVGGElement[]>([]);

  useEffect(() => {
    setError(null);
    const container = containerRef.current;
    if (!container) {
      setError("containerRef vacío");
      return;
    }
    const svg = container.querySelector("svg") as SVGSVGElement | null;
    if (!svg) {
      setError("No se encontró el <svg>");
      return;
    }

    // ===== 1) Cámara + viewport
    let camera = svg.querySelector("#camera") as SVGGElement | null;
    let viewport = svg.querySelector("#viewport") as SVGGElement | null;
    if (!camera) {
      camera = document.createElementNS("http://www.w3.org/2000/svg", "g");
      camera.setAttribute("id", "camera");
      svg.appendChild(camera);
    }
    if (!viewport) {
      viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
      viewport.setAttribute("id", "viewport");
      camera.appendChild(viewport);
    }
    // mover hijos al viewport (excepto defs y camera)
    Array.from(svg.childNodes).forEach((node) => {
      if (node === camera) return;
      if (node.nodeType === 1 && (node as Element).tagName.toLowerCase() === "defs")
        return;
      viewport!.appendChild(node);
    });

    // ===== 1.5) Capa de clusters =====
    let markersLayer = viewport.querySelector("#markers-layer") as SVGGElement | null;
    if (!markersLayer) {
      markersLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      markersLayer.setAttribute("id", "markers-layer");
      viewport.appendChild(markersLayer);
    } else {
      markersLayer.innerHTML = "";
    }

    // ===== 1.6) Capa de TIENDAS =====
    let storesLayer = viewport.querySelector("#stores-layer") as SVGGElement | null;
    if (!storesLayer) {
      storesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      storesLayer.setAttribute("id", "stores-layer");
      viewport.appendChild(storesLayer);
    } else {
      storesLayer.innerHTML = "";
    }

    // ===== 2) Encontrar país
    const incomingName = state?.name;
    const aliasName = ALIAS[slug] ?? null;
    const byName = (name: string) =>
      viewport!.querySelector(`path[name="${CSS.escape(name)}"]`) as SVGPathElement | null;

    let target: SVGPathElement | null = null;
    if (incomingName) target = byName(incomingName);
    if (!target && aliasName) target = byName(aliasName);
    if (!target) {
      const normSlug = normalize(slug);
      const all = Array.from(viewport.querySelectorAll("path[name]")) as SVGPathElement[];
      target = all.find((p) => slugify(p.getAttribute("name") || "") === normSlug) || null;
    }
    if (!target) {
      setError(`No se encontró el país para slug "${slug}".`);
      return;
    }

    const targetCountryName = target.getAttribute("name") || "";

    // ===== 3) Ocultar el resto
    const allPaths = Array.from(viewport.querySelectorAll("path[name]")) as SVGPathElement[];
    allPaths.forEach((p) => {
      if (p === target) {
        p.style.display = "inline";
        p.style.fill = "#7caf9aff";
        p.style.stroke = "#e0f7f0ff";
        p.style.strokeWidth = "0.2";
        p.style.pointerEvents = "auto";
      } else {
        p.style.display = "none";
        p.style.pointerEvents = "none";
      }
    });

    // ===== 3.5) Dibujar markers =====
    radiusCirclesRef.current = [];
    storesRef.current = [];

    (async () => {
      try {
        // Use data from context instead of CSV
        const { stores, clusters, storeDetails } = storesCtx;

        // Filter stores by country field from database
        const parsedStores = stores.filter((r) => {
          if (!r.country) return false;
          return countriesMatch(r.country, targetCountryName);
        });

        // Get unique cluster IDs from filtered stores
        const countryClusterIds = new Set(parsedStores.map((s) => s.cluster_id).filter(Boolean));
        
        // Filter clusters that belong to this country (based on stores)
        const parsedClusters = clusters.filter((c) => 
          countryClusterIds.has(Number(c.id))
        );

        setStoresList(parsedStores);

        // Map id -> inversion (num)
        const invById = new Map<string, number>();
        storeDetails.forEach((d) => {
          const inv = parseFloat(String(d.inversion ?? "").replace(",", "."));
          if (!Number.isNaN(inv)) invById.set(String(d.id), inv);
        });
        setInvByIdState(Object.fromEntries(invById.entries()));

        // Riesgo del país (solo tiendas aquí)
        const riskById = new Map<string, number>();
        parsedStores.forEach((s) => {
          const r = typeof s.totalRisk === "number" && !Number.isNaN(s.totalRisk) ? s.totalRisk : 0;
          riskById.set(String(s.id), r);
        });

        const riskValues = Array.from(riskById.values()).filter((v) => typeof v === "number" && !Number.isNaN(v));
        const maxRisk = riskValues.length ? Math.max(...riskValues) : 1;
        const minRisk = riskValues.length ? Math.min(...riskValues) : 0;

        // más riesgo => más rojo, menos riesgo => más verde
        const colorForStore = (storeId: string) => {
          const risk = riskById.get(String(storeId));
          if (risk == null) return "#ff8c00"; // fallback naranja

          // Normalizar por rango si hay variación, y si no, asumir [0..1]
          const normalized = maxRisk !== minRisk ? (risk - minRisk) / (maxRisk - minRisk) : clamp01(risk);
          // redToGreen(t): t=0 rojo, t=1 verde; para riesgo alto queremos rojo
          return redToGreen(1 - clamp01(normalized));
        };

        const vb =
          svg.viewBox && svg.viewBox.baseVal
            ? svg.viewBox.baseVal
            : ({
                x: 0,
                y: 0,
                width: svg.clientWidth || 1000,
                height: svg.clientHeight || 800,
              } as DOMRect);

        let projectFromUTM: (E: number, N: number) => { x: number; y: number };

        const hasAnchors =
          UTM_ANCHORS.every(([e, n]) => !(e === 0 && n === 0)) &&
          SVG_ANCHORS.every(([x, y]) => !(x === 0 && y === 0));

        if (hasAnchors) {
          try {
            const toSvg = affineFromN(UTM_ANCHORS, SVG_ANCHORS);
            projectFromUTM = (E, N) => toSvg(E, N);
          } catch (err) {
            console.error("Error afinidad (CountryMap), usando fallback:", err);
            let minE = Infinity,
              maxE = -Infinity,
              minN = Infinity,
              maxN = -Infinity;
            parsedClusters.forEach((r) => {
              if (r.E < minE) minE = r.E;
              if (r.E > maxE) maxE = r.E;
              if (r.N < minN) minN = r.N;
              if (r.N > maxN) maxN = r.N;
            });
            const eSpan = maxE - minE || 1;
            const nSpan = maxN - minN || 1;
            projectFromUTM = (E, N) => {
              const xRatio = (E - minE) / eSpan;
              const yRatio = 1 - (N - minN) / nSpan;
              const x = vb.x + xRatio * vb.width;
              const y = vb.y + yRatio * vb.height;
              return { x, y };
            };
          }
        } else {
          console.warn("Afinidad no configurada; usando proyección lineal (CountryMap)");
          let minE = Infinity,
            maxE = -Infinity,
            minN = Infinity,
            maxN = -Infinity;
          parsedClusters.forEach((r) => {
            if (r.E < minE) minE = r.E;
            if (r.E > maxE) maxE = r.E;
            if (r.N < minN) minN = r.N;
            if (r.N > maxN) maxN = r.N;
          });
          const eSpan = maxE - minE || 1;
          const nSpan = maxN - minN || 1;
          projectFromUTM = (E, N) => {
            const xRatio = (E - minE) / eSpan;
            const yRatio = 1 - (N - minN) / nSpan;
            const x = vb.x + xRatio * vb.width;
            const y = vb.y + yRatio * vb.height;
            return { x, y };
          };
        }

        // ===== CLUSTERS =====
        parsedClusters.forEach((r) => {
          const { x, y } = projectFromUTM(r.E, r.N);

          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("data-store-id", String(r.id));
          g.setAttribute("transform", `translate(${x}, ${y})`);
          g.style.cursor = "pointer";

          const radiusCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          radiusCircle.setAttribute("cx", "0");
          radiusCircle.setAttribute("cy", "0");
          radiusCircle.setAttribute("r", String(MARKER_RADIUS_PX));
          radiusCircle.setAttribute("fill", "rgba(75, 107, 253, 0.15)");
          radiusCircle.setAttribute("stroke", getMarkerColor(r.name));
          radiusCircle.setAttribute("stroke-width", "1.5");
          radiusCircle.style.display = showRadius ? "" : "none";
          radiusCirclesRef.current.push(radiusCircle);
          g.appendChild(radiusCircle);

          // (pin cluster está a 0x0, lo mantengo tal cual lo tenías)
          const ICON_W = 0;
          const ICON_H = 0;

          const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svgIcon.setAttribute("viewBox", PIN_VIEWBOX);
          svgIcon.setAttribute("width", String(ICON_W));
          svgIcon.setAttribute("height", String(ICON_H));
          svgIcon.setAttribute("x", String(-ICON_W / 2));
          svgIcon.setAttribute("y", String(-ICON_H * 0.85));

          const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
          gIcon.setAttribute("transform", PIN_GROUP_TRANSFORM);

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", PIN_PATH_D);
          path.setAttribute("fill", getMarkerColor(r.name));
          path.setAttribute("stroke", "#111");
          path.setAttribute("stroke-width", "40");

          gIcon.appendChild(path);
          svgIcon.appendChild(gIcon);
          g.appendChild(svgIcon);

          markersLayer!.appendChild(g);
        });

        // ===== TIENDAS =====
        parsedStores.forEach((r) => {
          const { x, y } = projectFromUTM(r.E, r.N);

          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("transform", `translate(${x}, ${y})`);
          g.style.cursor = "pointer";

          storesRef.current.push(g);
          g.style.display = showStores ? "" : "none";

          const STORE_ICON_W = 12;
          const STORE_ICON_H = 18;

          const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svgIcon.setAttribute("viewBox", PIN_VIEWBOX);
          svgIcon.setAttribute("width", String(STORE_ICON_W));
          svgIcon.setAttribute("height", String(STORE_ICON_H));
          svgIcon.setAttribute("x", String(-STORE_ICON_W / 2));
          svgIcon.setAttribute("y", String(-STORE_ICON_H * 0.85));

          const gIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
          gIcon.setAttribute("transform", "translate(0,1280) scale(0.045,-0.045)");

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", PIN_PATH_D);
          path.setAttribute("fill", colorForStore(r.id));
          path.setAttribute("stroke", "#ffffff");
          path.setAttribute("stroke-width", "15");

          gIcon.appendChild(path);
          svgIcon.appendChild(gIcon);
          g.appendChild(svgIcon);

          g.addEventListener("click", (e) => {
            e.stopPropagation();
            navigate(`/store/${r.id}`);
          });

          storesLayer!.appendChild(g);
        });
      } catch (err) {
        console.error("Error cargando markers en CountryMap:", err);
      }
    })();

    // ===== 4) Fit estable con viewBox =====
    const FIT_PAD_PX = 28;
    const FIT_SCALE_FACTOR = 0.85;

    const vb =
      svg.viewBox && svg.viewBox.baseVal
        ? svg.viewBox.baseVal
        : {
            x: 0,
            y: 0,
            width: svg.clientWidth || 1000,
            height: svg.clientHeight || 1000,
          };

    const bbox = target.getBBox();
    const rectPx = svg.getBoundingClientRect();
    const padUx = (FIT_PAD_PX / Math.max(rectPx.width, 1)) * vb.width;
    const padUy = (FIT_PAD_PX / Math.max(rectPx.height, 1)) * vb.height;

    const sX = (vb.width - 2 * padUx) / bbox.width;
    const sY = (vb.height - 2 * padUy) / bbox.height;
    const baseScale = Math.min(sX, sY) * FIT_SCALE_FACTOR;

    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const vbCx = vb.x + vb.width / 2;
    const vbCy = vb.y + vb.height / 2;

    const baseM = new DOMMatrix()
      .translate(vbCx, vbCy)
      .scale(baseScale)
      .translate(-cx, -cy);
    const baseInv = baseM.inverse();

    camera.setAttribute(
      "transform",
      `translate(${vbCx}, ${vbCy}) scale(${baseScale}) translate(${-cx}, ${-cy})`
    );

    // ---- Focus desde sidebar
    const focusOnStore = (id: string) => {
      try {
        const svgEl = container.querySelector("svg") as SVGSVGElement | null;
        if (!svgEl) return;
        const g = svgEl.querySelector(`g[data-store-id="${CSS.escape(id)}"]`) as
          | SVGGElement
          | null;
        if (!g) return;

        const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pulse.setAttribute("cx", "0");
        pulse.setAttribute("cy", "0");
        pulse.setAttribute("r", "6");
        pulse.setAttribute("fill", "rgba(255,140,0,0.9)");
        pulse.setAttribute("stroke", "#fff");
        pulse.setAttribute("stroke-width", "2");
        pulse.style.transition = "transform 300ms ease, opacity 800ms ease";
        pulse.style.transformOrigin = "center";
        g.appendChild(pulse);

        requestAnimationFrame(() => {
          pulse.style.transform = "scale(3)";
          pulse.style.opacity = "0";
        });
        setTimeout(() => pulse.remove(), 900);
      } catch {
        // ignore
      }
    };
    (container as any).__focusOnStore = focusOnStore;

    // ===== 5) Pan/zoom
    let z = 1;
    let tx = 0;
    let ty = 0;

    const buildTransform = () =>
      `translate(${vbCx}, ${vbCy}) scale(${baseScale}) translate(${-cx}, ${-cy}) translate(${tx}, ${ty}) scale(${z})`;

    let framePending = false;
    const scheduleRender = () => {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(() => {
        camera!.setAttribute("transform", buildTransform());
        framePending = false;
      });
    };

    const MIN_ZOOM = 0.4;
    const MAX_ZOOM = 8;

    const getSvgPoint = (evt: MouseEvent | PointerEvent) => {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      return ctm ? pt.matrixTransform(ctm.inverse()) : new DOMPoint(0, 0);
    };

    const toCameraSpace = (ptSvg: DOMPoint) => transformPoint(baseInv, ptSvg);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.pow(1.0018, e.deltaY);
      const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z / factor));
      if (newZ === z) return;

      const cursorSvg = getSvgPoint(e);
      const cursorCam = toCameraSpace(cursorSvg);

      tx = cursorCam.x - (cursorCam.x - tx) * (newZ / z);
      ty = cursorCam.y - (cursorCam.y - ty) * (newZ / z);
      z = newZ;
      scheduleRender();
    };

    let isPanning = false;
    let lastCam: DOMPoint | null = null;

    const onPointerDown = (e: PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      isPanning = true;
      lastCam = toCameraSpace(getSvgPoint(e));
      svg.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning || !lastCam) return;
      const nowCam = toCameraSpace(getSvgPoint(e));
      tx += nowCam.x - lastCam.x;
      ty += nowCam.y - lastCam.y;
      lastCam = nowCam;
      scheduleRender();
    };
    const onPointerUp = (e: PointerEvent) => {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      isPanning = false;
      lastCam = null;
      svg.style.cursor = "default";
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointerleave", onPointerUp);

    const refit = () => {
      z = 1;
      tx = 0;
      ty = 0;
      camera!.setAttribute(
        "transform",
        `translate(${vbCx}, ${vbCy}) scale(${baseScale}) translate(${-cx}, ${-cy})`
      );
    };

    const onResize = () => refit();
    window.addEventListener("resize", onResize);
    if (refitTick) refit();

    return () => {
      svg.removeEventListener("wheel", onWheel as EventListener);
      svg.removeEventListener("pointerdown", onPointerDown as EventListener);
      svg.removeEventListener("pointermove", onPointerMove as EventListener);
      svg.removeEventListener("pointerup", onPointerUp as EventListener);
      svg.removeEventListener("pointerleave", onPointerUp as EventListener);
      window.removeEventListener("resize", onResize);
    };
  }, [slug, state?.name, refitTick, navigate, showRadius, showStores]);

  useEffect(() => {
    radiusCirclesRef.current.forEach((circle) => {
      circle.style.display = showRadius ? "" : "none";
    });
  }, [showRadius]);

  useEffect(() => {
    storesRef.current.forEach((storeGroup) => {
      storeGroup.style.display = showStores ? "" : "none";
    });
  }, [showStores]);

  const title =
    state?.name ??
    ALIAS[slug] ??
    normalize(slug)
      .replace(/-/g, " ")
      .replace(/^./, (c) => c.toUpperCase());

  // ===== LISTA ORDENADA =====
  const sortedStores = useMemo(() => {
    const arr = [...storesList];

    if (sortBy === "inversion_desc") {
      arr.sort((a, b) => {
        const ia = invByIdState[String(a.id)] ?? -Infinity;
        const ib = invByIdState[String(b.id)] ?? -Infinity;
        return ib - ia; // mayor inversión primero
      });
      return arr;
    }

    // name_asc - ordenar por nombre de tienda (location)
    arr.sort((a, b) =>
      (a.location || a.name || "").localeCompare(b.location || b.name || "", "es", { sensitivity: "base" })
    );
    return arr;
  }, [storesList, sortBy, invByIdState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Controles */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={() => navigate(-1)}>← Volver</button>
        <button onClick={() => navigate(`/dashboard/${slug}`)}>Ver dashboard</button>
        <button onClick={() => setRefitTick((n) => n + 1)}>Re-centrar</button>

        <button onClick={() => setShowRadius((v) => !v)}>
          {showRadius ? "Ocultar clusters" : "Mostrar clusters"}
        </button>

        <button onClick={() => setShowStores((v) => !v)}>
          {showStores ? "Ocultar tiendas" : "Mostrar tiendas"}
        </button>
      </div>

      {/* Error visible */}
      {error && (
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            top: 12,
            right: 16,
            background: "rgba(0,0,0,.7)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 6,
            maxWidth: 460,
            fontSize: 12,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Layout */}
      <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            height: "100%",
            background: "#272424",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          <MapSVG style={{ width: "100%", height: "100%", cursor: "grab" }} />
        </div>

        {/* Sidebar */}
        <aside
          style={{
            width: 320,
            height: "100%",
            background: "#0f0f0f",
            color: "#fff",
            padding: 35,
            boxSizing: "border-box",
            overflowY: "auto",
            borderLeft: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <h2 style={{ margin: 0, marginBottom: 4, fontSize: 18, fontWeight: 600 }}>
            {title}
          </h2>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>Tiendas</div>

          {/* Orden */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#aaa" }}>Ordenar por</div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                flex: 1,
                background: "#151515",
                color: "white",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 12,
              }}
            >
              <option value="inversion_desc">Inversión (mayor → menor)</option>
              <option value="name_asc">Nombre (A → Z)</option>
            </select>
          </div>

          {sortedStores.length === 0 ? (
            <div style={{ color: "#999", fontSize: 13 }}>
              No hay tiendas cargadas para este país.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {sortedStores.map((s) => {
                const inv = invByIdState[String(s.id)];
                const invText = Number.isFinite(inv) ? inv.toFixed(2) : "—";

                return (
                  <li
                    key={s.id}
                    style={{
                      padding: "8px 6px",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{ cursor: "pointer", flex: 1 }}
                      onClick={() => {
                        const c = containerRef.current as any;
                        c?.__focusOnStore?.(String(s.id));
                      }}
                    >
                      <div style={{ fontSize: 14 }}>{s.location || s.name}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>
                        Inversión: {invText}
                      </div>
                      <div style={{ fontSize: 11, color: "#666" }}>
                        Cluster: {s.name}
                      </div>
                    </div>

                    <div style={{ marginLeft: 10 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/store/${s.id}`);
                        }}
                        title="Ver Dashboard"
                        style={{
                          background: "#333",
                          border: "1px solid #555",
                          color: "white",
                          borderRadius: 4,
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        📊
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
