import type { UnitId } from "./units.js";

// Klassische Schmiede-Forschung (inoffiziell; angenähert an help-Wiki).
// Pro Einheit: minimales Schmiede-Level, um Forschungsstufe 1 / 2 / 3 zu
// erreichen. 0 = keine Schmiede nötig (Spezialeinheit).
export const SMITHY_REQUIREMENTS: Record<UnitId, readonly [number, number, number]> = {
  spear:         [1, 5, 15],
  sword:         [3, 8, 17],
  axe:           [5, 10, 18],
  archer:        [8, 12, 19],
  scout:         [4, 9, 16],
  lightCav:      [6, 11, 17],
  mountedArcher: [12, 15, 18],
  heavyCav:      [15, 18, 20],
  ram:           [12, 15, 19],
  catapult:      [14, 17, 19],
  paladin:       [0, 0, 0],
  nobleman:      [0, 0, 0],
  militia:       [0, 0, 0],
};

// Forschungsbonus pro Stufe: 0 %, +10 %, +20 %, +30 % auf Angriff UND
// Verteidigung. Cap bei Stufe 3.
export const MAX_RESEARCH_LEVEL = 3;

export function researchBonus(level: number): number {
  const clamped = Math.max(0, Math.min(MAX_RESEARCH_LEVEL, level));
  return 1 + 0.1 * clamped;
}
