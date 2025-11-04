// src/pages/Map.tsx
import React, { useEffect, useRef, useState } from "react";
import MapSVG from "../assets/europe.svg?react";


type Tip = { name: string; x: number; y: number } | null;

export default function Map() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<Tip>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1) Localiza el <svg> real renderizado por el componente
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    // 2) Crea (o localiza) una capa overlay al final del SVG
    let overlay = svg.querySelector("#hover-layer") as SVGGElement | null;
    if (!overlay) {
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("id", "hover-layer");
      svg.appendChild(overlay);
    }

    // 3) Mapa para asociar cada path con su clon en overlay
    const clones = new WeakMap<Element, SVGPathElement>();

    // 4) Añade listeners a los <path name="...">
    const paths = svg.querySelectorAll("path[name]");
    const onEnter = (p: SVGPathElement) => (e: Event) => {
      const name = p.getAttribute("name") || "";
      const evt = e as MouseEvent;

      // tooltip junto al cursor
      setTip({ name, x: evt.clientX, y: evt.clientY });

      // clona el path y lo pone ARRIBA del todo
      const clone = p.cloneNode(true) as SVGPathElement;
      clones.set(p, clone);
        p.style.opacity = "0";
      // no debe robar eventos
      clone.style.pointerEvents = "none";

      // estilos de realce
      clone.style.fill = "#00ff88";
      clone.style.stroke = "#007a55";
      clone.style.strokeWidth = "1.5";

      // escalado suave centrado en su caja
      clone.style.transformBox = "fill-box";     // clave en SVG
      clone.style.transformOrigin = "center";    // clave en SVG
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

    const listeners: Array<{
      p: SVGPathElement;
      enter: EventListener;
      move: EventListener;
      leave: EventListener;
    }> = [];

    paths.forEach((el) => {
      const p = el as SVGPathElement;
      const enter = onEnter(p);
      const move = onMove(p);
      const leave = onLeave(p);
      p.addEventListener("mouseenter", enter);
      p.addEventListener("mousemove", move);
      p.addEventListener("mouseleave", leave);
      listeners.push({ p, enter, move, leave });

      // estilo base/hover visual del path original (opcional)
      p.style.transition = "fill 0.2s ease";
      p.addEventListener("mouseenter", () => (p.style.fill = "#b6ffe1"));
      p.addEventListener("mouseleave", () => (p.style.fill = ""));
    });

    // cleanup
    return () => {
      listeners.forEach(({ p, enter, move, leave }) => {
        p.removeEventListener("mouseenter", enter);
        p.removeEventListener("mousemove", move);
        p.removeEventListener("mouseleave", leave);
      });
      // limpia overlay
      if (overlay) overlay.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "90vw",
        height: "90vh",
        position: "relative",
        overflow: "hidden",
        background: "#272424ff",
      }}
    >
      <MapSVG style={{ width: "100%", height: "100%", cursor: "pointer" }} />

      {tip && (
        <div
          style={{
            position: "fixed",
            top: Math.min(tip.y + 12, window.innerHeight - 30),
            left: Math.min(tip.x + 12, window.innerWidth - 100),
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
