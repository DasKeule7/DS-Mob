import { BUILDINGS, type BuildingId, type Village } from "@ds-mob/core";
import { BUILDING_ICONS, BUILDING_LABELS } from "./buildingLabels.js";

interface Props {
  village: Village;
  onSelect: (building: BuildingId) => void;
}

const ORDER: readonly BuildingId[] = [
  "main", "barracks", "stable", "garage", "academy", "smithy",
  "market", "rally", "statue", "wood", "stone", "iron",
  "farm", "storage", "hide", "wall", "church", "watchtower",
];

export function BuildingGrid({ village, onSelect }: Props) {
  return (
    <div className="grid">
      {ORDER.map((id) => {
        const level = village.buildings[id];
        const maxLevel = BUILDINGS[id].maxLevel;
        const isAtMax = level >= maxLevel;
        const inQueue = village.buildQueue.some((o) => o.building === id);
        return (
          <button
            key={id}
            type="button"
            className={"tile" + (level === 0 ? " empty" : "") + (isAtMax ? " max" : "") + (inQueue ? " building" : "")}
            onClick={() => onSelect(id)}
          >
            <span className="tileIcon">{BUILDING_ICONS[id]}</span>
            <span className="tileName">{BUILDING_LABELS[id]}</span>
            <span className="tileLevel">
              {level > 0 ? `Stufe ${level}` : "—"}
              {inQueue ? " ⏳" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
