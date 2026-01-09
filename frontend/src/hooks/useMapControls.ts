import { useState, useCallback, useRef } from "react";

type MapControlsConfig = {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
};

type Pan = { x: number; y: number };

/**
 * Hook para controlar zoom y pan de un mapa SVG
 */
export function useMapControls(config: MapControlsConfig = {}) {
  const { minZoom = 0.4, maxZoom = 8, initialZoom = 1 } = config;

  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const handleWheel = useCallback(
    (deltaY: number) => {
      const factor = Math.pow(1.0018, deltaY);
      setZoom((z) => Math.min(maxZoom, Math.max(minZoom, z / factor)));
    },
    [minZoom, maxZoom]
  );

  const startPan = useCallback((x: number, y: number) => {
    isPanning.current = true;
    lastPoint.current = { x, y };
  }, []);

  const movePan = useCallback(
    (x: number, y: number, currentZoom: number) => {
      if (!isPanning.current || !lastPoint.current) return;

      const dx = x - lastPoint.current.x;
      const dy = y - lastPoint.current.y;

      setPan((p) => ({
        x: p.x + dx / currentZoom,
        y: p.y + dy / currentZoom,
      }));

      lastPoint.current = { x, y };
    },
    []
  );

  const endPan = useCallback(() => {
    isPanning.current = false;
    lastPoint.current = null;
  }, []);

  const reset = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [initialZoom]);

  return {
    zoom,
    pan,
    isPanning: isPanning.current,
    handleWheel,
    startPan,
    movePan,
    endPan,
    reset,
    setZoom,
    setPan,
  };
}
