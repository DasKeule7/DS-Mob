import {
  BUILDINGS,
  buildCost,
  buildTimeSeconds,
  targetLevelInQueue,
  resourcesAt,
  productionPerHour,
  storageCapacity,
  FARM_CAPACITY,
  MARKET_TRADERS,
  WALL_DEFENSE_MULTIPLIER,
  type BuildingId,
  type ProducerBuilding,
  type UnitId,
  type Village,
} from "@ds-mob/core";
import { BUILDING_ICONS, BUILDING_LABELS } from "./buildingLabels.js";
import { formatDuration } from "./BuildQueue.js";
import { RecruitPanel } from "./RecruitPanel.js";
import { AcademyPanel } from "./AcademyPanel.js";
import { SmithyPanel } from "./SmithyPanel.js";
import type { Player } from "@ds-mob/core";

const PRODUCER_BUILDINGS: Record<string, ProducerBuilding | null> = {
  barracks: "barracks",
  stable: "stable",
  garage: "garage",
  academy: "academy",
  statue: "statue",
};

interface Props {
  village: Village;
  building: BuildingId;
  worldSpeed: number;
  player?: Player | undefined;
  onClose: () => void;
  onUpgrade: () => void;
  onRecruit?: (unit: UnitId, count: number) => void;
  onMintCoin?: () => void;
  onResearch?: (unit: UnitId) => void;
}

export function BuildingSheet({ village, building, worldSpeed, player, onClose, onUpgrade, onRecruit, onMintCoin, onResearch }: Props) {
  const producer = PRODUCER_BUILDINGS[building] ?? null;
  const def = BUILDINGS[building];
  const currentLevel = village.buildings[building];
  const targetLevel = targetLevelInQueue(village, building);
  const nextLevel = targetLevel + 1;
  const atMax = nextLevel > def.maxLevel;
  const cost = atMax ? null : buildCost(building, nextLevel);
  const durationMs = atMax ? 0 : buildTimeSeconds(building, nextLevel, village.buildings.main, worldSpeed) * 1000;
  const currentRes = resourcesAt(village, Date.now(), worldSpeed);

  const canAfford = cost
    ? currentRes.wood >= cost.wood && currentRes.stone >= cost.stone && currentRes.iron >= cost.iron
    : false;

  return (
    <div className="sheetBackdrop" onClick={onClose} role="dialog">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheetHeader">
          <span className="sheetIcon">{BUILDING_ICONS[building]}</span>
          <div>
            <h2>{BUILDING_LABELS[building]}</h2>
            <p className="sheetLevel">
              Stufe {currentLevel}{targetLevel > currentLevel ? ` (geplant: ${targetLevel})` : ""} / {def.maxLevel}
            </p>
          </div>
          <button type="button" className="sheetClose" onClick={onClose} aria-label="Schließen">✕</button>
        </header>

        <BuildingEffect building={building} village={village} worldSpeed={worldSpeed} />

        {atMax ? (
          <p className="sheetNote">Maximal-Level erreicht.</p>
        ) : (
          <section className="sheetUpgrade">
            <h3>Ausbauen auf Stufe {nextLevel}</h3>
            <ul className="costList">
              <li>🌲 {cost!.wood.toLocaleString("de-DE")}</li>
              <li>🧱 {cost!.stone.toLocaleString("de-DE")}</li>
              <li>⛏️ {cost!.iron.toLocaleString("de-DE")}</li>
              <li>👥 {cost!.pop}</li>
              <li>⏱ {formatDuration(durationMs)}</li>
            </ul>
            <button
              type="button"
              className="sheetButton primary"
              disabled={!canAfford}
              onClick={onUpgrade}
            >
              {canAfford ? "Ausbauen" : "Nicht genug Rohstoffe"}
            </button>
          </section>
        )}

        {producer && onRecruit && village.buildings[building] > 0 && (
          <RecruitPanel village={village} producer={producer} worldSpeed={worldSpeed} onRecruit={onRecruit} />
        )}
        {building === "academy" && player && onMintCoin && village.buildings.academy > 0 && (
          <AcademyPanel village={village} player={player} onMint={onMintCoin} />
        )}
        {building === "smithy" && player && onResearch && village.buildings.smithy > 0 && (
          <SmithyPanel village={village} player={player} onResearch={onResearch} />
        )}
      </div>
    </div>
  );
}

function BuildingEffect({ building, village, worldSpeed }: { building: BuildingId; village: Village; worldSpeed: number }) {
  const lvl = village.buildings[building];
  if (lvl === 0) return <p className="sheetNote">Noch nicht gebaut.</p>;
  switch (building) {
    case "wood":
    case "stone":
    case "iron":
      return <p className="sheetNote">Produktion: <strong>{productionPerHour(lvl) * worldSpeed} / h</strong></p>;
    case "storage":
      return <p className="sheetNote">Kapazität: <strong>{storageCapacity(lvl).toLocaleString("de-DE")}</strong> pro Ressource</p>;
    case "farm":
      return <p className="sheetNote">Bauernhof-Kapazität: <strong>{(FARM_CAPACITY[lvl] ?? 240).toLocaleString("de-DE")}</strong></p>;
    case "wall":
      return <p className="sheetNote">Verteidigungs-Multiplikator: <strong>×{WALL_DEFENSE_MULTIPLIER[lvl]?.toFixed(2)}</strong></p>;
    case "market":
      return <p className="sheetNote">Händler: <strong>{MARKET_TRADERS[lvl] ?? 0}</strong></p>;
    default:
      return null;
  }
}
