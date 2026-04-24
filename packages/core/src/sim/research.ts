import { UNITS, type UnitId } from "../data/units.js";
import { SMITHY_REQUIREMENTS, MAX_RESEARCH_LEVEL } from "../data/research.js";
import type { Player, Resources, Village } from "../state/index.js";

// Kosten für die nächste Forschungsstufe (1-basiert, toLevel=1..3). Skaliert
// exponentiell mit Unit-Basiskosten. Formel ist eine bewusste Vereinfachung
// des Originals, aber ausgewogen genug fürs MVP.
export function researchCost(unit: UnitId, toLevel: number): Resources {
  const base = UNITS[unit].cost;
  const mult = 40 * toLevel * toLevel; // 40 / 160 / 360 der Unit-Grundkosten
  return {
    wood: base.wood * mult,
    stone: base.stone * mult,
    iron: base.iron * mult,
  };
}

export interface ResearchError {
  kind: "smithyMissing" | "maxLevel" | "noSmithyRequirement" | "insufficientResources";
  message: string;
}

// Versucht, eine Einheit zu erforschen. Synchron (kein Timer) — MVP-Vereinfachung.
// Gibt neuen Village + Player zurück (Player hält die Forschungsstufen).
export function researchUnit(
  village: Village,
  player: Player,
  unit: UnitId,
): { ok: true; village: Village; player: Player } | { ok: false; error: ResearchError } {
  const current = player.research[unit] ?? 0;
  if (current >= MAX_RESEARCH_LEVEL) {
    return { ok: false, error: { kind: "maxLevel", message: "Maximale Forschungsstufe erreicht." } };
  }
  const toLevel = current + 1;
  const requirement = SMITHY_REQUIREMENTS[unit][toLevel - 1] ?? 0;
  if (requirement === 0) {
    return { ok: false, error: { kind: "noSmithyRequirement", message: "Einheit hat keine Schmiede-Forschung." } };
  }
  if (village.buildings.smithy < requirement) {
    return { ok: false, error: { kind: "smithyMissing", message: `Schmiede Stufe ${requirement} benötigt.` } };
  }
  const cost = researchCost(unit, toLevel);
  if (village.resources.wood < cost.wood || village.resources.stone < cost.stone || village.resources.iron < cost.iron) {
    return { ok: false, error: { kind: "insufficientResources", message: "Nicht genug Rohstoffe." } };
  }
  const newVillage: Village = {
    ...village,
    resources: {
      wood: village.resources.wood - cost.wood,
      stone: village.resources.stone - cost.stone,
      iron: village.resources.iron - cost.iron,
    },
  };
  const newPlayer: Player = {
    ...player,
    research: { ...player.research, [unit]: toLevel },
  };
  return { ok: true, village: newVillage, player: newPlayer };
}
