// src/pages/CountryMap.tsx
import React, { useEffect, useRef, useState } from "react";
import MapSVG from "../assets/europe.svg?react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/* ===== Utils ===== */
const normalize = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ").trim();

const slugify = (s: string) => normalize(s).replace(/\s+/g, "-");

const ALIAS: Record<string, string> = {
  spain: "España", germany: "Alemania", france: "Francia", italy: "Italia",
  "united-kingdom": "Reino Unido", netherlands: "Países Bajos", belgium: "Bélgica",
  switzerland: "Suiza", austria: "Austria", poland: "Polonia", czechia: "Chequia",
  "czech-republic": "Chequia", slovakia: "Eslovaquia", hungary: "Hungría",
  slovenia: "Eslovenia", croatia: "Croacia", greece: "Grecia", romania: "Rumanía",
  bulgaria: "Bulgaria", lithuania: "Lituania", latvia: "Letonia", estonia: "Estonia",
  finland: "Finlandia", sweden: "Suecia", norway: "Noruega", iceland: "Islandia",
  ireland: "Irlanda", andorra: "Andorra", monaco: "Mónaco", "san-marino": "San Marino",
  liechtenstein: "Liechtenstein", luxembourg: "Luxemburgo", malta: "Malta",
  cyprus: "Chipre", albania: "Albania", serbia: "Serbia", montenegro: "Montenegro",
  "north-macedonia": "Macedonia del Norte", macedonia: "Macedonia del Norte",
  "bosnia-and-herzegovina": "Bosnia y Herzegovina", bosnia: "Bosnia y Herzegovina",
  kosovo: "Kosovo", moldova: "Moldavia", ukraine: "Ucrania", belarus: "Bielorrusia",
};

// multiplica DOMMatrix * punto → DOMPoint
const transformPoint = (m: DOMMatrix, p: DOMPoint) =>
  new DOMPoint(p.x * m.a + p.y * m.c + m.e, p.x * m.b + p.y * m.d + m.f);

export default function CountryMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { slug = "" } = useParams<{ slug: string }>();
  const { state } = useLocation() as { state?: { name?: string } };

  const [error, setError] = useState<string | null>(null);
  const [refitTick, setRefitTick] = useState(0);

  useEffect(() => {
    setError(null);
    const container = containerRef.current;
    if (!container) { setError("containerRef vacío"); return; }
    const svg = container.querySelector("svg") as SVGSVGElement | null;
    if (!svg) { setError("No se encontró el <svg>"); return; }

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
      if (node.nodeType === 1 && (node as Element).tagName.toLowerCase() === "defs") return;
      viewport!.appendChild(node);
    });

    // ===== 2) Encontrar país
    const incomingName = state?.name;
    const aliasName = ALIAS[slug] ?? null;
    const byName = (name: string) => viewport!.querySelector(`path[name="${CSS.escape(name)}"]`) as SVGPathElement | null;

    let target: SVGPathElement | null = null;
    if (incomingName) target = byName(incomingName);
    if (!target && aliasName) target = byName(aliasName);
    if (!target) {
      const normSlug = normalize(slug);
      const all = Array.from(viewport.querySelectorAll("path[name]")) as SVGPathElement[];
      target = all.find((p) => slugify(p.getAttribute("name") || "") === normSlug) || null;
    }
    if (!target) { setError(`No se encontró el país para slug "${slug}".`); return; }

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

    // ===== 4) Fit estable con viewBox (menos zoom inicial)
    const FIT_PAD_PX = 28;
    const FIT_SCALE_FACTOR = 0.85; // <1 = más lejos

    const vb = svg.viewBox && svg.viewBox.baseVal
      ? svg.viewBox.baseVal
      : { x: 0, y: 0, width: svg.clientWidth || 1000, height: svg.clientHeight || 1000 };

    const bbox = target.getBBox();
    const rectPx = svg.getBoundingClientRect();
    const padUx = (FIT_PAD_PX / Math.max(rectPx.width, 1))  * vb.width;
    const padUy = (FIT_PAD_PX / Math.max(rectPx.height, 1)) * vb.height;

    const sX = (vb.width  - 2 * padUx) / bbox.width;
    const sY = (vb.height - 2 * padUy) / bbox.height;
    const baseScale = Math.min(sX, sY) * FIT_SCALE_FACTOR;

    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const vbCx = vb.x + vb.width / 2;
    const vbCy = vb.y + vb.height / 2;

    // Matriz base y su inversa (para convertir puntos a espacio "cámara")
    const baseM = new DOMMatrix()
      .translate(vbCx, vbCy)
      .scale(baseScale)
      .translate(-cx, -cy);
    const baseInv = baseM.inverse();

    // set base transform una vez
    camera.setAttribute("transform",
      `translate(${vbCx}, ${vbCy}) scale(${baseScale}) translate(${-cx}, ${-cy})`
    );

    // ===== 5) Extra transform (pan/zoom) en espacio "cámara" + rAF
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

    // ⚠️ Convertimos el cursor a ESPACIO CÁMARA con baseInv
    const toCameraSpace = (ptSvg: DOMPoint) => transformPoint(baseInv, ptSvg);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // zoom multiplicativo suave
      const factor = Math.pow(1.0018, e.deltaY);
      const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z / factor));
      if (newZ === z) return;

      const cursorSvg = getSvgPoint(e);
      const cursorCam = toCameraSpace(cursorSvg); // 👈 punto en coords cámara

      // mantener el cursor anclado en coords cámara
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

    // Recentrar: resetea extra (usa misma baseM/baseInv)
    const refit = () => {
      z = 1; tx = 0; ty = 0;
      camera!.setAttribute("transform",
        `translate(${vbCx}, ${vbCy}) scale(${baseScale}) translate(${-cx}, ${-cy})`
      );
    };

    // Resize: recomputa TODO el fit (simple: refit base)
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
  }, [slug, state?.name, refitTick]);

  const title =
    state?.name ??
    (ALIAS[slug] ??
      normalize(slug).replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()));

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Controles */}
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: 8 }}>
        <button onClick={() => navigate(-1)}>← Volver</button>
        <button onClick={() => navigate(`/dashboard/${slug}`)}>Ver dashboard</button>
        <button onClick={() => setRefitTick((n) => n + 1)}>Re-centrar</button>
      </div>

      {/* Error visible */}
      {error && (
        <div style={{
          position: "absolute", zIndex: 10, top: 12, right: 16,
          background: "rgba(0,0,0,.7)", color: "#fff", padding: "6px 10px",
          borderRadius: 6, maxWidth: 460, fontSize: 12,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Contenedor del SVG */}
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          background: "#272424",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <MapSVG style={{ width: "100%", height: "100%", cursor: "grab" }} />
        <div
          style={{
            position: "absolute", top: 12, right: 16,
            color: "#00ff88", fontWeight: 700, fontSize: "1.1rem",
            textShadow: "0 1px 2px rgba(0,0,0,.5)",
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
