import { UNITS, type UnitId } from "../data/units.js";
import type { Coord } from "../state/index.js";

export function distanceFields(a: Coord, b: Coord): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Reisezeit = Distanz * langsamste-Einheit-Speed (min/Feld) * 60_000
// / (worldSpeed * unitSpeed). Speed eines Angriffs = min{speedMinPerField der
// gewählten Einheiten mit count > 0}.
export function travelTimeMs(
  from: Coord,
  to: Coord,
  units: Partial<Record<UnitId, number>>,
  opts: { worldSpeed: number; unitSpeed: number } = { worldSpeed: 1, unitSpeed: 1 },
): number {
  const dist = distanceFields(from, to);
  let slowest = 0;
  for (const id of Object.keys(units) as UnitId[]) {
    const n = units[id] ?? 0;
    if (n <= 0) continue;
    const s = UNITS[id].speedMinPerField;
    if (s > slowest) slowest = s;
  }
  if (slowest <= 0) return 0;
  const minutes = dist * slowest;
  return (minutes * 60_000) / Math.max(0.01, opts.worldSpeed * opts.unitSpeed);
}

// Summe aller Einheiten eines Haufens.
export function totalUnits(units: Partial<Record<UnitId, number>>): number {
  let s = 0;
  for (const id of Object.keys(units) as UnitId[]) s += units[id] ?? 0;
  return s;
}

// Maximale Beute-Kapazität eines Haufens (Summe carry * count).
export function carryCapacity(units: Partial<Record<UnitId, number>>): number {
  let s = 0;
  for (const id of Object.keys(units) as UnitId[]) {
    const n = units[id] ?? 0;
    s += n * UNITS[id].carry;
  }
  return s;
}
