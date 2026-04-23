import { useEffect, useMemo, useRef, useState } from "react";
import { BARBARIAN_OWNER_ID, type Village, type WorldState } from "@ds-mob/core";

interface Props {
  world: WorldState;
  myVillageId: string;
  onSelect: (villageId: string) => void;
}

// Kartenanzeige: schlanke SVG-Karte, pan-fähig, Dörfer als Icons.
// Chunk-Loading sparen wir uns für MVP, 60 Dörfer in SVG sind mobile-tauglich.
export function MapView({ world, myVillageId, onSelect }: Props) {
  const me = world.villages[myVillageId];
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(10); // Pixel pro Feld
  const [center, setCenter] = useState<{ x: number; y: number }>(me ? me.coord : { x: 100, y: 100 });
  const [containerSize, setContainerSize] = useState({ w: 320, h: 400 });
  const dragState = useRef<{ startX: number; startY: number; centerX: number; centerY: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const villagesArr = useMemo(() => Object.values(world.villages), [world.villages]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, centerX: center.x, centerY: center.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragState.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    setCenter({ x: d.centerX - dx, y: d.centerY - dy });
  }
  function onPointerUp() {
    dragState.current = null;
  }

  // Sichtbare Felder umrechnen
  const halfW = containerSize.w / scale / 2;
  const halfH = containerSize.h / scale / 2;
  const minX = center.x - halfW;
  const minY = center.y - halfH;

  function pos(v: Village): { cx: number; cy: number } {
    return {
      cx: (v.coord.x - minX) * scale,
      cy: (v.coord.y - minY) * scale,
    };
  }

  return (
    <div className="mapWrap">
      <div className="mapControls">
        <button type="button" onClick={() => setScale((s) => Math.max(3, s - 3))} aria-label="Rauszoomen">−</button>
        <button type="button" onClick={() => setCenter(me ? me.coord : { x: 100, y: 100 })} aria-label="Zentrieren">⌂</button>
        <button type="button" onClick={() => setScale((s) => Math.min(32, s + 3))} aria-label="Reinzoomen">+</button>
      </div>
      <div
        className="mapCanvas"
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
      >
        <svg width={containerSize.w} height={containerSize.h}>
          <defs>
            <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
              <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="rgba(201,169,106,0.08)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {villagesArr.map((v) => {
            const { cx, cy } = pos(v);
            if (cx < -20 || cx > containerSize.w + 20 || cy < -20 || cy > containerSize.h + 20) return null;
            const isMe = v.id === myVillageId;
            const isBarb = v.ownerId === BARBARIAN_OWNER_ID;
            const r = isMe ? 8 : 5;
            return (
              <g key={v.id} transform={`translate(${cx},${cy})`} onClick={(e) => { e.stopPropagation(); onSelect(v.id); }} style={{ cursor: "pointer" }}>
                <circle r={r + 2} fill={isMe ? "rgba(201,169,106,0.3)" : "transparent"} />
                <circle r={r} fill={isMe ? "#c9a96a" : isBarb ? "#7a5a3c" : "#b0463a"} stroke="#1b120e" strokeWidth={1} />
                {scale >= 8 && (
                  <text y={r + 9} textAnchor="middle" fontSize="9" fill="#c9a96a">
                    {v.coord.x}|{v.coord.y}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
