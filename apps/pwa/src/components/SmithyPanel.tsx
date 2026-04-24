import {
  UNITS,
  SMITHY_REQUIREMENTS,
  MAX_RESEARCH_LEVEL,
  researchCost,
  type UnitId,
  type Player,
  type Village,
} from "@ds-mob/core";
import { UNIT_LABELS } from "./buildingLabels.js";

interface Props {
  village: Village;
  player: Player;
  onResearch: (unit: UnitId) => void;
}

export function SmithyPanel({ village, player, onResearch }: Props) {
  if (village.buildings.smithy <= 0) return null;
  const smithyLvl = village.buildings.smithy;

  // Nur Einheiten, die überhaupt erforschbar sind (Schmiede-Requirement > 0).
  const researchable = (Object.keys(SMITHY_REQUIREMENTS) as UnitId[]).filter(
    (id) => SMITHY_REQUIREMENTS[id][0] > 0,
  );

  return (
    <section className="smithyPanel">
      <h3>Forschung</h3>
      <p className="sheetNote">Forschungsbonus: +10 % Angriff/Verteidigung pro Stufe.</p>
      {researchable.map((id) => {
        const current = player.research[id] ?? 0;
        const atMax = current >= MAX_RESEARCH_LEVEL;
        const nextLevel = current + 1;
        const req = SMITHY_REQUIREMENTS[id][nextLevel - 1] ?? 0;
        const meetsSmithy = smithyLvl >= req;
        const cost = atMax ? null : researchCost(id, nextLevel);
        const canAfford = cost
          ? village.resources.wood >= cost.wood &&
            village.resources.stone >= cost.stone &&
            village.resources.iron >= cost.iron
          : false;

        return (
          <div key={id} className="researchRow">
            <div className="researchRowInfo">
              <strong>{UNIT_LABELS[id]}</strong>
              <span className="subtle">
                Stufe {current}/{MAX_RESEARCH_LEVEL}
                {!atMax ? ` · Schmiede ${req} benötigt` : ""}
              </span>
            </div>
            {!atMax && cost && (
              <div className="researchRowCost">
                <span>🌲 {cost.wood.toLocaleString("de-DE")}</span>
                <span>🧱 {cost.stone.toLocaleString("de-DE")}</span>
                <span>⛏️ {cost.iron.toLocaleString("de-DE")}</span>
              </div>
            )}
            <button
              type="button"
              className="sheetButton primary compact"
              disabled={atMax || !meetsSmithy || !canAfford}
              onClick={() => onResearch(id)}
            >
              {atMax ? "Max" : !meetsSmithy ? "Schmiede zu klein" : !canAfford ? "Rohstoffe" : "Forschen"}
            </button>
          </div>
        );
      })}
    </section>
  );
}
