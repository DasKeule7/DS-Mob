import { UNITS, type UnitId } from "../data/units.js";
import type { Flight, Support, Village, WorldState } from "../state/index.js";
import { distanceFields, travelTimeMs } from "./movement.js";

let flightCounter = 1;

export function nextFlightId(): string {
  return `flight_${Date.now().toString(36)}_${(flightCounter++).toString(36)}`;
}

let supportCounter = 1;
export function nextSupportId(): string {
  return `sup_${Date.now().toString(36)}_${(supportCounter++).toString(36)}`;
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

function buildFlight(
  state: WorldState,
  input: SendAttackInput,
  mode: "attack" | "support",
): { ok: true; state: WorldState; flight: Flight } | { ok: false; error: SendAttackError } {
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
    mode,
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

export function sendAttack(state: WorldState, input: SendAttackInput) {
  return buildFlight(state, input, "attack");
}

export function sendSupport(state: WorldState, input: SendAttackInput) {
  return buildFlight(state, input, "support");
}

// Unterstützung zurückrufen: Erzeugt Rückflug zum Herkunftsdorf und entfernt
// den Support-Eintrag aus dem Zieldorf.
export function recallSupport(state: WorldState, villageId: string, supportId: string, nowMs: number): { ok: true; state: WorldState } | { ok: false; error: string } {
  const host = state.villages[villageId];
  if (!host) return { ok: false, error: "Dorf unbekannt." };
  const sup = host.supports.find((s) => s.id === supportId);
  if (!sup) return { ok: false, error: "Unterstützung nicht gefunden." };
  const home = state.villages[sup.fromVillageId];
  if (!home) return { ok: false, error: "Herkunftsdorf existiert nicht mehr." };
  const travelMs = travelTimeMs(host.coord, home.coord, sup.units, {
    worldSpeed: state.config.speed,
    unitSpeed: state.config.unitSpeed,
  });
  const flight: Flight = {
    id: nextFlightId(),
    ownerId: sup.ownerId,
    fromVillageId: host.id,
    toVillageId: home.id,
    units: { ...sup.units },
    startMs: nowMs,
    arriveMs: nowMs + travelMs,
    mode: "return",
  };
  const newHost: Village = { ...host, supports: host.supports.filter((s) => s.id !== supportId) };
  return {
    ok: true,
    state: {
      ...state,
      villages: { ...state.villages, [host.id]: newHost },
      flights: [...state.flights, flight],
    },
  };
}

export interface AttackPreview {
  distanceFields: number;
  travelMs: number;
  arriveMs: number;
  carry: number;
  popCost: number;
}

export function previewAttack(state: WorldState, fromId: string, toId: string, units: Partial<Record<UnitId, number>>, nowMs: number): AttackPreview | null {
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

// Hilfsfunktion: Support in Village einfügen oder zusammenführen (gleicher
// Herkunftsowner + fromVillage addiert Einheiten).
export function mergeSupport(existing: Support[], incoming: Support): Support[] {
  const same = existing.find((s) => s.ownerId === incoming.ownerId && s.fromVillageId === incoming.fromVillageId);
  if (!same) return [...existing, incoming];
  const mergedUnits: Partial<Record<UnitId, number>> = { ...same.units };
  for (const id of Object.keys(incoming.units) as UnitId[]) {
    mergedUnits[id] = (mergedUnits[id] ?? 0) + (incoming.units[id] ?? 0);
  }
  return existing.map((s) => (s === same ? { ...s, units: mergedUnits } : s));
}
