import { UNITS, type UnitId } from "../data/units.js";
import type { Flight, Village, WorldState } from "../state/index.js";
import { distanceFields, travelTimeMs } from "./movement.js";

let flightCounter = 1;

export function nextFlightId(): string {
  return `flight_${Date.now().toString(36)}_${(flightCounter++).toString(36)}`;
}

export interface SendAttackInput {
  fromVillageId: string;
  toVillageId: string;
  units: Partial<Record<UnitId, number>>;
  nowMs: number;
}

export interface SendAttackError {
  kind: "villageMissing" | "notEnoughUnits" | "noUnits" | "sameVillage";
  message: string;
}

// Erstellt einen Angriffs-Flight und zieht Einheiten aus dem Ausgangsdorf ab.
// Reine Funktion: liefert neuen WorldState oder Fehler.
export function sendAttack(state: WorldState, input: SendAttackInput): { ok: true; state: WorldState; flight: Flight } | { ok: false; error: SendAttackError } {
  const from = state.villages[input.fromVillageId];
  const to = state.villages[input.toVillageId];
  if (!from || !to) return { ok: false, error: { kind: "villageMissing", message: "Dorf unbekannt." } };
  if (from.id === to.id) return { ok: false, error: { kind: "sameVillage", message: "Ziel ist das Ausgangsdorf." } };

  let anyUnit = false;
  for (const id of Object.keys(input.units) as UnitId[]) {
    const req = input.units[id] ?? 0;
    if (req < 0) return { ok: false, error: { kind: "notEnoughUnits", message: "Ungültige Truppenanzahl." } };
    if (req > 0) {
      anyUnit = true;
      if (from.units[id] < req) return { ok: false, error: { kind: "notEnoughUnits", message: `Nicht genug ${id}.` } };
    }
  }
  if (!anyUnit) return { ok: false, error: { kind: "noUnits", message: "Keine Einheiten ausgewählt." } };

  const distMs = travelTimeMs(from.coord, to.coord, input.units, {
    worldSpeed: state.config.speed,
    unitSpeed: state.config.unitSpeed,
  });
  const flight: Flight = {
    id: nextFlightId(),
    ownerId: from.ownerId,
    fromVillageId: from.id,
    toVillageId: to.id,
    units: { ...input.units },
    startMs: input.nowMs,
    arriveMs: input.nowMs + distMs,
    mode: "attack",
  };

  const updatedUnits = { ...from.units };
  for (const id of Object.keys(input.units) as UnitId[]) {
    updatedUnits[id] -= input.units[id] ?? 0;
  }
  const newFrom: Village = { ...from, units: updatedUnits };

  return {
    ok: true,
    state: {
      ...state,
      villages: { ...state.villages, [from.id]: newFrom },
      flights: [...state.flights, flight],
    },
    flight,
  };
}

// Vorschau-Infos für die UI (Reise + Ankunft). Ruft keine Mutation.
export function previewAttack(state: WorldState, fromId: string, toId: string, units: Partial<Record<UnitId, number>>, nowMs: number): {
  distanceFields: number;
  travelMs: number;
  arriveMs: number;
  carry: number;
  popCost: number;
} | null {
  const from = state.villages[fromId];
  const to = state.villages[toId];
  if (!from || !to) return null;
  const d = distanceFields(from.coord, to.coord);
  const travelMs = travelTimeMs(from.coord, to.coord, units, { worldSpeed: state.config.speed, unitSpeed: state.config.unitSpeed });
  let carry = 0, pop = 0;
  for (const id of Object.keys(units) as UnitId[]) {
    const n = units[id] ?? 0;
    carry += n * UNITS[id].carry;
    pop += n * UNITS[id].cost.pop;
  }
  return { distanceFields: d, travelMs, arriveMs: nowMs + travelMs, carry, popCost: pop };
}
