import { useEffect, useState } from "react";
import {
  resourcesAt,
  productionPerHour,
  storageCapacity,
  FARM_CAPACITY,
  UNITS,
  type Village,
  type UnitId,
} from "@ds-mob/core";

interface Props {
  village: Village;
  worldSpeed: number;
}

export function ResourceBar({ village, worldSpeed }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const res = resourcesAt(village, now, worldSpeed);
  const cap = storageCapacity(village.buildings.storage);
  const farmCap = FARM_CAPACITY[Math.min(village.buildings.farm, FARM_CAPACITY.length - 1)] ?? 240;
  const popUsed = (Object.keys(village.units) as UnitId[]).reduce(
    (sum, id) => sum + village.units[id] * UNITS[id].cost.pop,
    0,
  );

  return (
    <header className="resourceBar">
      <ResourceCell label="🌲" amount={res.wood} cap={cap} rate={productionPerHour(village.buildings.wood) * worldSpeed} />
      <ResourceCell label="🧱" amount={res.stone} cap={cap} rate={productionPerHour(village.buildings.stone) * worldSpeed} />
      <ResourceCell label="⛏️" amount={res.iron} cap={cap} rate={productionPerHour(village.buildings.iron) * worldSpeed} />
      <div className="popCell" aria-label="Bauernhof">
        <span className="popIcon">👥</span>
        <span>{popUsed} / {farmCap}</span>
      </div>
    </header>
  );
}

function ResourceCell({ label, amount, cap, rate }: { label: string; amount: number; cap: number; rate: number }) {
  const isFull = amount >= cap;
  return (
    <div className={"resourceCell" + (isFull ? " full" : "")} title={`${rate}/h`}>
      <span className="resourceIcon">{label}</span>
      <div className="resourceValue">
        <span className="amount">{Math.floor(amount).toLocaleString("de-DE")}</span>
        <span className="cap">/ {cap.toLocaleString("de-DE")}</span>
      </div>
    </div>
  );
}
