import { useEffect, useState } from "react";
import type { Village } from "@ds-mob/core";
import { BUILDING_LABELS } from "./buildingLabels.js";

interface Props {
  village: Village;
  onCancel: (index: number) => void;
}

export function BuildQueue({ village, onCancel }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (village.buildQueue.length === 0) {
    return <div className="queue empty">Keine Bauaufträge.</div>;
  }
  return (
    <ol className="queue">
      {village.buildQueue.map((order, i) => {
        const remainingMs = Math.max(0, order.finishMs - now);
        return (
          <li key={i} className="queueItem">
            <div className="queueInfo">
              <strong>{BUILDING_LABELS[order.building]}</strong>
              <span className="queueLevel">→ Stufe {order.toLevel}</span>
            </div>
            <span className="queueTime">{formatDuration(remainingMs)}</span>
            <button type="button" className="queueCancel" onClick={() => onCancel(i)} aria-label="Abbrechen">
              ✕
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
