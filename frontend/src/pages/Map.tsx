// src/pages/Map.tsx
import React, { useEffect, useRef, useState } from "react";
import MapSVG from "../assets/europe.svg?react";
import { useNavigate } from "react-router-dom";
type Tip = { name: string; x: number; y: number } | null;

export default function Map() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<Tip>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const svg = containerRef.current.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    // ---------- 1) Crear viewport y mover hijos dentro ----------
    let viewport = svg.querySelector("#viewport") as SVGGElement | null;
    if (!viewport) {
      viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
      viewport.setAttribute("id", "viewport");

      // Mover TODOS los hijos actuales del svg dentro del viewport, conservando orden
      const children = Array.from(svg.childNodes);
      children.forEach((node) => {
        // evita mover <defs> si los hay, también se pueden mover (funciona igual),
        // pero los dejamos para claridad.
        if (
          node.nodeType === 1 &&
          (node as Element).tagName.toLowerCase() === "defs"
        ) {
          return;
        }
        viewport!.appendChild(node);
      });

      svg.appendChild(viewport);
    }

    // ---------- 2) Asegurar overlay dentro del viewport ----------
    let overlay = viewport.querySelector("#hover-layer") as SVGGElement | null;
    if (!overlay) {
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("id", "hover-layer");
      viewport.appendChild(overlay); // importante: dentro del viewport
    } else if (overlay.parentNode !== viewport) {
      viewport.appendChild(overlay); // muévelo al viewport si estaba fuera
    }

    // ---------- 3) Hover + clon sobre paths con atributo name ----------
    const clones = new WeakMap<Element, SVGPathElement>();
    const paths = viewport.querySelectorAll("path[name]");

    const onEnter = (p: SVGPathElement) => (e: Event) => {
      const name = p.getAttribute("name") || "";
      const evt = e as MouseEvent;

      setTip({ name, x: evt.clientX, y: evt.clientY });

      const clone = p.cloneNode(true) as SVGPathElement;
      clones.set(p, clone);

      // Ocultar original durante el hover
      p.style.opacity = "0";

      // Estilos del clon y animación
      clone.style.pointerEvents = "none";
      clone.style.fill = "#00ff88";
      clone.style.stroke = "#007a55";
      clone.style.strokeWidth = "1.5";
      clone.style.transformBox = "fill-box";
      clone.style.transformOrigin = "center";
      clone.style.transform = "scale(1.18)";
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

    const listeners: Array<{ p: SVGPathElement; enter: EventListener; move: EventListener; leave: EventListener }> = [];

    paths.forEach((el) => {
      const p = el as SVGPathElement;
      p.style.transition = "fill 0.2s ease, opacity 0.2s ease";

      const enter = onEnter(p);
      const move = onMove(p);
      const leave = onLeave(p);

      p.addEventListener("mouseenter", enter);
      p.addEventListener("mousemove", move);
      p.addEventListener("mouseleave", leave);
      listeners.push({ p, enter, move, leave });

      // brillo base (opcional)
      p.addEventListener("mouseenter", () => (p.style.fill = "#b6ffe1"));
      p.addEventListener("mouseleave", () => (p.style.fill = ""));
    });

    // ---------- 4) Zoom + Pan manual sobre el viewport ----------
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 6;
    const ZOOM_STEP = 0.1;

    let scale = 1;
    let tx = 0;
    let ty = 0;

    let isPanning = false;
    let startPt: DOMPoint | null = null;

    // Utilidad: transformar coordenadas de pantalla a coords del SVG
    const getSvgPoint = (evt: MouseEvent | PointerEvent) => {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      // invertimos para pasar de pantalla a SVG
      return ctm ? pt.matrixTransform(ctm.inverse()) : new DOMPoint(0, 0);
    };

    const applyTransform = () => {
      viewport!.setAttribute("transform", `translate(${tx}, ${ty}) scale(${scale})`);
    };

    // Zoom centrado en el cursor
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + dir * ZOOM_STEP));
      if (newScale === scale) return;

      // punto del cursor en coords SVG antes de cambiar escala
      const cursor = getSvgPoint(e);
      // para mantener el cursor "anclado" en la misma posición visual:
      // (cursor - translate) * newScale = (cursor - translate') * oldScale
      // => ajustamos translate en base a la diferencia de escala
      tx = cursor.x - (cursor.x - tx) * (newScale / scale);
      ty = cursor.y - (cursor.y - ty) * (newScale / scale);

      scale = newScale;
      applyTransform();
    };

    // Pan (drag) con puntero
    const onPointerDown = (e: PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      isPanning = true;
      startPt = getSvgPoint(e);
      // cambiar cursor del svg
      svg.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning || !startPt) return;
      const pt = getSvgPoint(e);
      // desplazamiento en coords SVG (no en pantalla)
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

    // listeners de zoom/pan
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

      svg.removeEventListener("wheel", onWheel as EventListener);
      svg.removeEventListener("pointerdown", onPointerDown as EventListener);
      svg.removeEventListener("pointermove", onPointerMove as EventListener);
      svg.removeEventListener("pointerup", onPointerUp as EventListener);
      svg.removeEventListener("pointerleave", onPointerUp as EventListener);
    };
  }, []);

  return (
    <>
      <div>
        <button onClick={() => navigate("/dashboards")}>Info</button>
      </div>
      <div
        ref={containerRef}
        style={{
          width: "90vw",
          height: "90vh",
          position: "relative",
          overflow: "hidden",
          background: "#272424ff",
          userSelect: "none",
        }}
      >
        {/* el SVG real */}
        <MapSVG style={{ width: "100%", height: "100%", cursor: "grab" }} />

        {/* Tooltip flotante */}
        {tip && (
          <div
            style={{
              position: "fixed",
              top: Math.min(tip.y + 12, window.innerHeight - 30),
              left: Math.min(tip.x + 12, window.innerWidth - 140),
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
    </>
  );
}
