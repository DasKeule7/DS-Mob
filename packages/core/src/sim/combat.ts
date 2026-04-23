import { UNITS, type UnitId } from "../data/units.js";
import { WALL_DEFENSE_MULTIPLIER } from "../data/production.js";

export type UnitCounts = Partial<Record<UnitId, number>>;

export interface CombatOptions {
  wallLevel: number;
  nightBonus: boolean; // Welt-Setting: ist Nachtbonus aktiv?
  attackHour?: number; // Stunde des Angriffs (0–23). Default 12 (kein Bonus).
  moraleAttacker: number; // 0.3..1.0
  luckPercent: number; // -25..+25
}

export interface CombatResult {
  attackerSurvivors: UnitCounts;
  defenderSurvivors: UnitCounts;
  winner: "attacker" | "defender" | "draw";
  attackerPower: number;
  defenderPower: number;
  usedWallLevel: number;
  details: {
    wallMultiplier: number;
    nightMultiplier: number;
    luckMultiplier: number;
    moraleMultiplier: number;
  };
}

// Summiert die Angriffsstärke nach Kategorie — bestimmt, welche Def gezogen
// wird. "special" (AG) und "siege" werden als "infantry" gewichtet.
function attackByCategory(units: UnitCounts): { infantry: number; cavalry: number; archer: number; total: number } {
  let inf = 0, cav = 0, arc = 0;
  for (const id of Object.keys(units) as UnitId[]) {
    const n = units[id] ?? 0;
    if (n <= 0) continue;
    const def = UNITS[id];
    const atk = def.attack * n;
    switch (def.category) {
      case "cavalry":  cav += atk; break;
      case "archer":   arc += atk; break;
      default:         inf += atk; break;
    }
  }
  return { infantry: inf, cavalry: cav, archer: arc, total: inf + cav + arc };
}

// Verteidigungsstärke eines Bestands gegen ein bekanntes Angreiferprofil.
function defensePower(units: UnitCounts, attackerRatio: { inf: number; cav: number; arc: number }): number {
  let total = 0;
  for (const id of Object.keys(units) as UnitId[]) {
    const n = units[id] ?? 0;
    if (n <= 0) continue;
    const d = UNITS[id].defense;
    total += n * (d.general * attackerRatio.inf + d.cavalry * attackerRatio.cav + d.archer * attackerRatio.arc);
  }
  return total;
}

// Rammbock reduziert das effektive Wall-Level für diesen Kampf.
// Original: mehr Rammböcke = tieferer Abzug, begrenzt auf halbes Wall-Level.
// Vereinfachte Formel: pro 30 Rammböcke -1 Level, min. halbes Wall-Level.
export function effectiveWallLevel(wallLevel: number, rams: number): number {
  const reduction = Math.floor(rams / 30);
  const lowerBound = Math.ceil(wallLevel / 2);
  return Math.max(lowerBound, wallLevel - reduction);
}

export function wallDefenseMultiplier(level: number): number {
  const idx = Math.max(0, Math.min(level, WALL_DEFENSE_MULTIPLIER.length - 1));
  return WALL_DEFENSE_MULTIPLIER[idx] ?? 1;
}

// Kernkampf. Grundformel (vereinfacht, aber strukturell identisch mit TW):
//   power_att = ∑ unit.attack * count, gewichtet mit Glück/Moral
//   power_def = ∑ unit.def_cat * count, gewichtet mit Wall- und Nachtbonus
//   Verlustquote des Gewinners = (loser_power / winner_power)^1.5
//   Verlierer verliert alle Einheiten.
export function simulateCombat(
  attacker: UnitCounts,
  defender: UnitCounts,
  opts: CombatOptions,
): CombatResult {
  const atkByCat = attackByCategory(attacker);
  const ratio = atkByCat.total > 0
    ? { inf: atkByCat.infantry / atkByCat.total, cav: atkByCat.cavalry / atkByCat.total, arc: atkByCat.archer / atkByCat.total }
    : { inf: 1, cav: 0, arc: 0 };

  const rams = attacker.ram ?? 0;
  const usedWallLevel = effectiveWallLevel(opts.wallLevel, rams);
  const wallMult = wallDefenseMultiplier(usedWallLevel);

  const nightActive = opts.nightBonus && (opts.attackHour ?? 12) >= 0 && (opts.attackHour ?? 12) < 8;
  const nightMult = nightActive ? 2 : 1;
  const luckMult = 1 + Math.max(-25, Math.min(25, opts.luckPercent)) / 100;
  const moraleMult = Math.max(0.3, Math.min(1, opts.moraleAttacker));

  const powerAtkRaw = atkByCat.total;
  const powerDefRaw = defensePower(defender, ratio);
  const powerAtk = powerAtkRaw * luckMult * moraleMult;
  const powerDef = powerDefRaw * wallMult * nightMult;

  let attackerSurvivors: UnitCounts = {};
  let defenderSurvivors: UnitCounts = {};
  let winner: CombatResult["winner"];

  if (powerAtk <= 0 && powerDef <= 0) {
    winner = "draw";
  } else if (powerAtk > powerDef) {
    winner = "attacker";
    const lossRatio = Math.pow(powerDef / Math.max(1, powerAtk), 1.5);
    for (const id of Object.keys(attacker) as UnitId[]) {
      const n = attacker[id] ?? 0;
      attackerSurvivors[id] = Math.max(0, Math.round(n * (1 - lossRatio)));
    }
    defenderSurvivors = {};
  } else if (powerDef > powerAtk) {
    winner = "defender";
    const lossRatio = Math.pow(powerAtk / Math.max(1, powerDef), 1.5);
    for (const id of Object.keys(defender) as UnitId[]) {
      const n = defender[id] ?? 0;
      defenderSurvivors[id] = Math.max(0, Math.round(n * (1 - lossRatio)));
    }
    attackerSurvivors = {};
  } else {
    winner = "draw";
  }

  return {
    attackerSurvivors,
    defenderSurvivors,
    winner,
    attackerPower: powerAtk,
    defenderPower: powerDef,
    usedWallLevel,
    details: { wallMultiplier: wallMult, nightMultiplier: nightMult, luckMultiplier: luckMult, moraleMultiplier: moraleMult },
  };
}

// Moral-Formel: Verhältnis der Spielerpunkte mildert den Angriff gegen
// deutlich kleinere Spieler. 1.0 = volle Stärke, min 0.3.
// Formel laut Support-KB: base = 500/att_points * def_points + 0.5
// Original ist komplexer (zusätzlich Account-Alter), wir nutzen nur den
// Punkte-Anteil als guten Standard.
export function computeMorale(attackerPoints: number, defenderPoints: number): number {
  if (attackerPoints <= 0) return 1;
  const raw = (defenderPoints / attackerPoints) * 3 + 0.3;
  return Math.max(0.3, Math.min(1, raw));
}

// Zufallsglück im Bereich -25..+25 % auf Basis eines PRNG (deterministisch
// für Tests, wenn ein Seed-PRNG übergeben wird).
export function rollLuck(rand: () => number = Math.random): number {
  return Math.round((rand() * 50 - 25) * 100) / 100;
}
