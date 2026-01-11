// src/pages/Map.tsx
import { useEffect, useRef, useState } from "react";
import MapSVG from "../assets/europe.svg?react";
import { useNavigate } from "react-router-dom";

// Utilidades consolidadas
import { slugify } from "../utils/slugify";
import { affineFromN, UTM_ANCHORS, SVG_ANCHORS } from "../utils/geo";
import {
  MARKER_RADIUS_PX,
  PIN_VIEWBOX,
  PIN_GROUP_TRANSFORM,
  PIN_PATH_D,
  getMarkerColor,
} from "../utils/mapIcons";
import { useStores } from "../context/StoresContext";
import type { MapTooltip } from "../types";

export default function Map() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<MapTooltip>(null);
  
  // Use stores context instead of fetching CSV
  const { clusters, loading: loadingStores } = useStores();

  // Estado del toggle para mostrar radios de clusters
  const [showRadius, setShowRadius] = useState(false);

  // Referencia a todos los círculos de radio creados
  const radiusCirclesRef = useRef<SVGCircleElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const svg = containerRef.current.querySelector(
      "svg"
    ) as SVGSVGElement | null;
    if (!svg) return;

    // ---------- 1) Crear/asegurar viewport ----------
    let viewport = svg.querySelector("#viewport") as SVGGElement | null;
    if (!viewport) {
      viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
      viewport.setAttribute("id", "viewport");
      const children = Array.from(svg.childNodes);
      children.forEach((node) => {
        if (
          node.nodeType === 1 &&
          (node as Element).tagName.toLowerCase() === "defs"
        )
          return;
        viewport!.appendChild(node);
      });
      svg.appendChild(viewport);
    }

    // ---------- 2) Asegurar overlay ----------
    let overlay = viewport.querySelector("#hover-layer") as SVGGElement | null;
    if (!overlay) {
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("id", "hover-layer");
      viewport.appendChild(overlay);
    }

    // ---------- 3) Capa de marcadores ----------
    let markers = viewport.querySelector(
      "#markers-layer"
    ) as SVGGElement | null;
    if (!markers) {
      markers = document.createElementNS("http://www.w3.org/2000/svg", "g");
      markers.setAttribute("id", "markers-layer");
      viewport.appendChild(markers);
    } else {
      markers.innerHTML = "";
    }

    const getSvgPoint = (evt: MouseEvent | PointerEvent) => {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      return ctm ? pt.matrixTransform(ctm.inverse()) : new DOMPoint(0, 0);
    };

    const onDebugClick = (e: MouseEvent) => {
      if (!e.altKey) return;
      const pt = getSvgPoint(e);
      console.log("DEBUG SVG click:", { x: pt.x, y: pt.y });
    };
    svg.addEventListener("click", onDebugClick);

    // ========== 4) PINTAR CLUSTERS (desde contexto) ==========
    if (loadingStores) return;
    
    (async () => {
      const parsed = clusters
        .filter((r) => !Number.isNaN(r.N) && !Number.isNaN(r.E));

      if (!parsed.length) {
        console.warn("No hay filas válidas en el CSV UTM");
        return;
      }

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
          console.log("Afinidad N puntos ACTIVADA");
        } catch (err) {
          console.error("Error construyendo afinidad, usando fallback:", err);
          let minE = Infinity,
            maxE = -Infinity,
            minN = Infinity,
            maxN = -Infinity;
          parsed.forEach((r) => {
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
        console.warn(
          "Afinidad no configurada; usando proyección lineal UTM→viewBox"
        );
        let minE = Infinity,
          maxE = -Infinity,
          minN = Infinity,
          maxN = -Infinity;
        parsed.forEach((r) => {
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

      // limpiamos referencia de círculos
      radiusCirclesRef.current = [];
      // --- Dibujar marcadores --- /*    parsed.forEach((r) => { const { x, y } = projectFromUTM(r.E, r.N); // Grupo para poder mover/escala el pin fácilmente const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("transform", `translate(${x}, ${y})`); g.style.cursor = "pointer"; // Texto con emoji 📍 const text = document.createElementNS("http://www.w3.org/2000/svg", "text"); text.setAttribute("x", "0"); text.setAttribute("y", "0"); text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "bottom"); text.setAttribute("font-size", "18"); // ajusta tamaño del pin text.textContent = "📍"; // Opcional: colorizar un poco (depende de fuente/OS, a veces ignora fill) text.setAttribute("fill", "#ff4757"); g.appendChild(text); // Tooltip g.addEventListener("mouseenter", (e) => { const me = e as MouseEvent; setTip({ name: r.name, x: me.clientX, y: me.clientY }); }); g.addEventListener("mousemove", (e) => { const me = e as MouseEvent; setTip((t) => (t ? { ...t, x: me.clientX, y: me.clientY } : null)); }); g.addEventListener("mouseleave", () => setTip(null)); // Click en el pin g.addEventListener("click", () => { console.log("Click marcador:", r.name); // Aquí podrías navegar a la ficha: navigate(`/store/${slugify(r.name)}`, { state: { ...r } }); }); markers!.appendChild(g); });*/
      // --- Dibujar marcadores + círculo de radio ---
      parsed.forEach((r) => {
        const { x, y } = projectFromUTM(r.E, r.N);

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${x}, ${y})`);
        g.style.cursor = "pointer";

        // 🔵 Círculo de radio (centrado en el marker)
        const radiusCircle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        radiusCircle.setAttribute("cx", "0");
        radiusCircle.setAttribute("cy", "0");
        radiusCircle.setAttribute("r", String(MARKER_RADIUS_PX));
        radiusCircle.setAttribute("fill", "rgba(75, 107, 253, 0.15)");
        radiusCircle.setAttribute("stroke", getMarkerColor(r.name));
        radiusCircle.setAttribute("stroke-width", "1.5");
        radiusCircle.style.display = showRadius ? "" : "none";

        radiusCirclesRef.current.push(radiusCircle);
        g.appendChild(radiusCircle);

        // Pin SVG
        const ICON_W = 24;
        const ICON_H = 24;

        const svgIcon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svgIcon.setAttribute("viewBox", PIN_VIEWBOX);
        svgIcon.setAttribute("width", String(ICON_W));
        svgIcon.setAttribute("height", String(ICON_H));
        svgIcon.setAttribute("x", String(-ICON_W / 2));
        svgIcon.setAttribute("y", String(-ICON_H * 0.85));

        const gIcon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        gIcon.setAttribute("transform", PIN_GROUP_TRANSFORM);

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("d", PIN_PATH_D);
        path.setAttribute("fill", getMarkerColor(r.name));
        path.setAttribute("stroke", "#111");
        path.setAttribute("stroke-width", "40");

        gIcon.appendChild(path);
        svgIcon.appendChild(gIcon);
        g.appendChild(svgIcon);

        // Tooltip
        g.addEventListener("mouseenter", (e) => {
          const me = e as MouseEvent;
          setTip({ name: r.name, x: me.clientX, y: me.clientY });
        });
        g.addEventListener("mousemove", (e) => {
          const me = e as MouseEvent;
          setTip((t) => (t ? { ...t, x: me.clientX, y: me.clientY } : null));
        });
        g.addEventListener("mouseleave", () => setTip(null));

        g.addEventListener("click", () => {
          console.log("Click marcador:", r.name);
        });

        markers!.appendChild(g);
      });
    })();

    // ---------- 5) Hover países ----------
    const clones = new WeakMap<Element, SVGPathElement>();
    const paths = viewport.querySelectorAll("path[name]");

    const onEnter = (p: SVGPathElement) => (e: Event) => {
      const name = p.getAttribute("name") || "";
      const evt = e as MouseEvent;

      setTip({ name, x: evt.clientX, y: evt.clientY });

      const clone = p.cloneNode(true) as SVGPathElement;
      clones.set(p, clone);

      p.style.opacity = "0";

      clone.style.pointerEvents = "none";
      clone.style.fill = "#7caf9aff";
      clone.style.stroke = "#e0f7f0ff";
      clone.style.strokeWidth = "1";
      clone.style.transformBox = "fill-box";
      clone.style.transformOrigin = "center";
      clone.style.transform = "scale(1.02)";
      clone.style.transition = "transform 0.2s ease, fill 0.2s ease";

      overlay!.appendChild(clone);
    };

    const onMove = (_p: SVGPathElement) => (e: Event) => {
      const evt = e as MouseEvent;
      setTip((t) => (t ? { ...t, x: evt.clientX, y: evt.clientY } : null));
    };

    const onLeave = (p: SVGPathElement) => () => {
      setTip(null);
      const clone = clones.get(p);
      if (clone && clone.parentNode) {
        clone.style.transform = "scale(1)";
        clone.style.transition = "transform 0.2s ease";
        clone.parentNode.removeChild(clone);
      }
      clones.delete(p);
      p.style.opacity = "1";
    };

    const listeners: Array<{
      p: SVGPathElement;
      enter: EventListener;
      move: EventListener;
      leave: EventListener;
    }> = [];

    paths.forEach((el) => {
      const p = el as SVGPathElement;
      p.style.transition = "fill 0.2s ease, opacity 0.2s ease";

      const enter = onEnter(p);
      const move = onMove(p);
      const leave = onLeave(p);
      const onClick = (e: MouseEvent) => {
        if (e.altKey) return;
        const name = p.getAttribute("name") || "";
        const slug = slugify(name);
        navigate(`/country/${slug}`, { state: { name } });
      };
      p.addEventListener("mouseenter", enter);
      p.addEventListener("mousemove", move);
      p.addEventListener("mouseleave", leave);
      p.addEventListener("click", onClick);
      listeners.push({ p, enter, move, leave });

      p.addEventListener("mouseenter", () => (p.style.fill = "#b6ffe1"));
      p.addEventListener("mouseleave", () => (p.style.fill = ""));
    });

    // ---------- 6) Zoom + Pan ----------
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 6;
    const ZOOM_STEP = 0.1;

    let scale = 1;
    let tx = 0;
    let ty = 0;

    let isPanning = false;
    let startPt: DOMPoint | null = null;

    const applyTransform = () => {
      viewport!.setAttribute(
        "transform",
        `translate(${tx}, ${ty}) scale(${scale})`
      );
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, scale + dir * ZOOM_STEP)
      );
      if (newScale === scale) return;

      const cursor = getSvgPoint(e);
      tx = cursor.x - (cursor.x - tx) * (newScale / scale);
      ty = cursor.y - (cursor.y - ty) * (newScale / scale);

      scale = newScale;
      applyTransform();
    };

    const onPointerDown = (e: PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      isPanning = true;
      startPt = getSvgPoint(e);
      svg.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning || !startPt) return;
      const pt = getSvgPoint(e);
      tx += pt.x - startPt.x;
      ty += pt.y - startPt.y;
      startPt = pt;
      applyTransform();
    };

    const onPointerUp = (e: PointerEvent) => {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      isPanning = false;
      startPt = null;
      svg.style.cursor = "default";
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointerleave", onPointerUp);

    // ---------- cleanup ----------
    return () => {
      listeners.forEach(({ p, enter, move, leave }) => {
        p.removeEventListener("mouseenter", enter);
        p.removeEventListener("mousemove", move);
        p.removeEventListener("mouseleave", leave);
      });
      overlay && (overlay.innerHTML = "");

      svg.removeEventListener("click", onDebugClick as EventListener);
      svg.removeEventListener("wheel", onWheel as EventListener);
      svg.removeEventListener("pointerdown", onPointerDown as EventListener);
      svg.removeEventListener("pointermove", onPointerMove as EventListener);
      svg.removeEventListener("pointerup", onPointerUp as EventListener);
      svg.removeEventListener("pointerleave", onPointerUp as EventListener);
    };
  }, [navigate]);

  // 🔵 NUEVO: cuando cambien showRadius o radiusPx, actualizamos todos los círculos
  useEffect(() => {
    radiusCirclesRef.current.forEach((circle) => {
      circle.style.display = showRadius ? "" : "none";
    });
  }, [showRadius]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "98vw",
        height: "90vh",
        position: "relative",
        overflow: "hidden",
        background: "#272424ff",
        userSelect: "none",
        border: "2px solid #444",
        borderRadius: "8px",
      }}
    >
      {/* Barra de controles dentro del viewport */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
      >
        <button onClick={() => navigate("/dashboards")}>Info</button>

        <button onClick={() => setShowRadius((v) => !v)}>
          {showRadius ? "Ocultar clusters" : "Mostrar clusters"}
        </button>
      </div>

      {/* el SVG real */}
      <MapSVG style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* Tooltip flotante */}
      {tip && (
        <div
          style={{
            position: "fixed",
            top: Math.min(tip.y + 12, window.innerHeight - 30),
            left: Math.min(tip.x + 12, window.innerWidth - 180),
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: "0.9rem",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {tip.name}
        </div>
      )}
    </div>
  );
}
