import { useState } from "react";
import {
  UNITS,
  recruitTimeSeconds,
  FARM_CAPACITY,
  type ProducerBuilding,
  type UnitId,
  type Village,
} from "@ds-mob/core";
import { UNIT_LABELS } from "./buildingLabels.js";
import { formatDuration } from "./BuildQueue.js";

interface Props {
  village: Village;
  producer: ProducerBuilding;
  worldSpeed: number;
  onRecruit: (unit: UnitId, count: number) => void;
}

export function RecruitPanel({ village, producer, worldSpeed, onRecruit }: Props) {
  const level = village.buildings[producerBuildingId(producer)];
  if (level <= 0) return <p className="sheetNote">Gebäude noch nicht gebaut.</p>;

  const unitIds = (Object.keys(UNITS) as UnitId[]).filter((id) => UNITS[id].producedIn === producer && id !== "militia");

  return (
    <section className="recruitPanel">
      <h3>Rekrutieren</h3>
      {unitIds.map((id) => (
        <UnitRow key={id} unit={id} level={level} village={village} worldSpeed={worldSpeed} onRecruit={onRecruit} />
      ))}
    </section>
  );
}

function producerBuildingId(producer: ProducerBuilding): "barracks" | "stable" | "garage" | "academy" | "statue" | "farm" {
  return producer;
}

function UnitRow({ unit, level, village, worldSpeed, onRecruit }: { unit: UnitId; level: number; village: Village; worldSpeed: number; onRecruit: (u: UnitId, n: number) => void }) {
  const def = UNITS[unit];
  const [count, setCount] = useState<string>("1");
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const totalWood = def.cost.wood * n;
  const totalStone = def.cost.stone * n;
  const totalIron = def.cost.iron * n;
  const farmCap = FARM_CAPACITY[Math.min(village.buildings.farm, FARM_CAPACITY.length - 1)] ?? 240;
  const perUnitSec = recruitTimeSeconds(unit, level, worldSpeed);

  return (
    <div className="unitRow">
      <div className="unitRowHeader">
        <strong>{UNIT_LABELS[unit]}</strong>
        <span className="unitStats">
          ⚔{def.attack} 🛡{def.defense.general}/{def.defense.cavalry}/{def.defense.archer}
        </span>
      </div>
      <div className="unitRowInfo">
        <span>🌲 {def.cost.wood} · 🧱 {def.cost.stone} · ⛏️ {def.cost.iron} · 👥 {def.cost.pop}</span>
        <span>⏱ {formatDuration(perUnitSec * 1000)}/Stk</span>
      </div>
      <div className="unitRowActions">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={count}
          onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
          aria-label={`Anzahl ${UNIT_LABELS[unit]}`}
        />
        <button
          type="button"
          className="sheetButton primary compact"
          disabled={n <= 0 || farmCap <= 0}
          onClick={() => n > 0 && onRecruit(unit, n)}
          title={`${totalWood} / ${totalStone} / ${totalIron}`}
        >
          +{n}
        </button>
      </div>
    </div>
  );
}
