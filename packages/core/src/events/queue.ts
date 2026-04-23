import { resourcesAt, storageCapacity } from "../sim/production.js";
import { applyBuildFinish } from "../sim/construction.js";
import { applyRecruitTick } from "../sim/recruitment.js";
import { simulateCombat, computeMorale } from "../sim/combat.js";
import { carryCapacity, travelTimeMs } from "../sim/movement.js";
import { nextFlightId } from "../sim/flights.js";
import { UNITS, type UnitId } from "../data/units.js";
import type { WorldState, Village, Flight, Report, Resources } from "../state/index.js";
import type { GameEvent } from "./index.js";

function collectDueEvents(state: WorldState, untilMs: number): GameEvent[] {
  const events: GameEvent[] = [];
  for (const village of Object.values(state.villages)) {
    for (const o of village.buildQueue) {
      if (o.finishMs <= untilMs) {
        events.push({ kind: "buildFinish", atMs: o.finishMs, villageId: village.id, building: o.building, toLevel: o.toLevel });
      }
    }
    for (const producer of Object.keys(village.recruitQueues) as (keyof typeof village.recruitQueues)[]) {
      for (const order of village.recruitQueues[producer]) {
        let tick = order.nextFinishMs;
        for (let i = 0; i < order.remainingCount && tick <= untilMs; i++) {
          events.push({ kind: "recruitTick", atMs: tick, villageId: village.id, producer, unit: order.unit });
          tick += order.perUnitMs;
        }
      }
    }
  }
  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

// Holt fällige Flights in sortierter Reihenfolge.
function collectDueFlights(state: WorldState, untilMs: number): Flight[] {
  return state.flights
    .filter((f) => f.arriveMs <= untilMs)
    .sort((a, b) => a.arriveMs - b.arriveMs);
}

function playerPointsOf(state: WorldState, playerId: string): number {
  return state.players[playerId]?.points ?? 100;
}

function syncVillage(v: Village, atMs: number, worldSpeed: number): Village {
  return { ...v, resources: resourcesAt(v, atMs, worldSpeed), lastUpdateMs: atMs };
}

let reportCounter = 1;
function nextReportId(): string {
  return `report_${Date.now().toString(36)}_${(reportCounter++).toString(36)}`;
}

// Verarbeitet einen Attack-Flight: simuliert Kampf, aktualisiert Verteidigungs-
// dorf, erzeugt Rückflug mit überlebenden Truppen + Beute, legt Bericht an.
function resolveAttack(state: WorldState, flight: Flight, moraleEnabled: boolean, nightBonus: boolean): WorldState {
  const target = state.villages[flight.toVillageId];
  if (!target) return { ...state, flights: state.flights.filter((f) => f !== flight) };
  const source = state.villages[flight.fromVillageId]; // kann auch erobert worden sein

  const targetSynced = syncVillage(target, flight.arriveMs, state.config.speed);
  const defenderUnits: Partial<Record<UnitId, number>> = {};
  for (const id of Object.keys(targetSynced.units) as UnitId[]) {
    if (targetSynced.units[id] > 0) defenderUnits[id] = targetSynced.units[id];
  }

  const attackerPoints = playerPointsOf(state, flight.ownerId);
  const defenderPoints = playerPointsOf(state, targetSynced.ownerId);
  const morale = moraleEnabled ? computeMorale(attackerPoints, defenderPoints) : 1;
  const attackHour = new Date(flight.arriveMs).getUTCHours();
  const luckPercent = 0; // deterministisch für den MVP; später seedbar.

  const combat = simulateCombat(flight.units, defenderUnits, {
    wallLevel: targetSynced.buildings.wall,
    nightBonus,
    attackHour,
    moraleAttacker: morale,
    luckPercent,
  });

  // Defender-Einheiten updaten: nur Überlebende bleiben.
  const newTargetUnits = { ...targetSynced.units };
  for (const id of Object.keys(newTargetUnits) as UnitId[]) {
    newTargetUnits[id] = combat.defenderSurvivors[id] ?? 0;
  }

  // Beute: nur wenn Angreifer gewinnt, Carry * Überlebende, limitiert auf
  // Target-Ressourcen, gleichmäßig über die 3 Ressourcen aufgeteilt.
  let loot: Resources | undefined = undefined;
  let newTargetResources = targetSynced.resources;
  if (combat.winner === "attacker") {
    const maxCarry = carryCapacity(combat.attackerSurvivors);
    const pool = targetSynced.resources.wood + targetSynced.resources.stone + targetSynced.resources.iron;
    const takeTotal = Math.min(maxCarry, pool);
    if (takeTotal > 0 && pool > 0) {
      const fWood = targetSynced.resources.wood / pool;
      const fStone = targetSynced.resources.stone / pool;
      const fIron = targetSynced.resources.iron / pool;
      const w = Math.floor(takeTotal * fWood);
      const s = Math.floor(takeTotal * fStone);
      const i = Math.floor(takeTotal * fIron);
      loot = { wood: w, stone: s, iron: i };
      newTargetResources = {
        wood: targetSynced.resources.wood - w,
        stone: targetSynced.resources.stone - s,
        iron: targetSynced.resources.iron - i,
      };
    } else {
      loot = { wood: 0, stone: 0, iron: 0 };
    }
  }

  const updatedTarget: Village = {
    ...targetSynced,
    units: newTargetUnits,
    resources: newTargetResources,
  };

  // Rückflug nur, wenn Angreifer Überlebende hat und das Ausgangsdorf noch
  // existiert (und dem Angreifer gehört).
  const returnUnits: Partial<Record<UnitId, number>> = {};
  for (const id of Object.keys(combat.attackerSurvivors) as UnitId[]) {
    const n = combat.attackerSurvivors[id] ?? 0;
    if (n > 0) returnUnits[id] = n;
  }
  const newFlights = state.flights.filter((f) => f !== flight);
  if (Object.keys(returnUnits).length > 0 && source && source.ownerId === flight.ownerId) {
    const travelMs = travelTimeMs(updatedTarget.coord, source.coord, returnUnits, {
      worldSpeed: state.config.speed,
      unitSpeed: state.config.unitSpeed,
    });
    const returnFlight: Flight = {
      id: nextFlightId(),
      ownerId: flight.ownerId,
      fromVillageId: flight.toVillageId,
      toVillageId: flight.fromVillageId,
      units: returnUnits,
      startMs: flight.arriveMs,
      arriveMs: flight.arriveMs + travelMs,
      mode: "return",
      ...(loot ? { loot } : {}),
    };
    newFlights.push(returnFlight);
  }

  const report: Report = {
    id: nextReportId(),
    atMs: flight.arriveMs,
    attackerId: flight.ownerId,
    defenderId: targetSynced.ownerId,
    fromVillageId: flight.fromVillageId,
    toVillageId: flight.toVillageId,
    attackerUnits: flight.units,
    defenderUnits,
    attackerSurvivors: combat.attackerSurvivors,
    defenderSurvivors: combat.defenderSurvivors,
    winner: combat.winner,
    ...(loot ? { loot } : {}),
    luckPercent,
    wallLevel: targetSynced.buildings.wall,
    effectiveWallLevel: combat.usedWallLevel,
    read: false,
  };

  return {
    ...state,
    villages: { ...state.villages, [updatedTarget.id]: updatedTarget },
    flights: newFlights,
    reports: [report, ...state.reports].slice(0, 100),
  };
}

// Rückflug ankommen: Einheiten + Beute zurück ins Dorf.
function resolveReturn(state: WorldState, flight: Flight): WorldState {
  const home = state.villages[flight.toVillageId];
  if (!home || home.ownerId !== flight.ownerId) {
    // Heimatdorf wurde zwischenzeitlich erobert o. ä. — Truppen sind verloren.
    return { ...state, flights: state.flights.filter((f) => f !== flight) };
  }
  const synced = syncVillage(home, flight.arriveMs, state.config.speed);
  const newUnits = { ...synced.units };
  for (const id of Object.keys(flight.units) as UnitId[]) {
    newUnits[id] += flight.units[id] ?? 0;
  }
  const cap = storageCapacity(synced.buildings.storage);
  const newResources = flight.loot
    ? {
        wood: Math.min(cap, synced.resources.wood + flight.loot.wood),
        stone: Math.min(cap, synced.resources.stone + flight.loot.stone),
        iron: Math.min(cap, synced.resources.iron + flight.loot.iron),
      }
    : synced.resources;
  return {
    ...state,
    villages: { ...state.villages, [home.id]: { ...synced, units: newUnits, resources: newResources } },
    flights: state.flights.filter((f) => f !== flight),
  };
}

export function advanceTo(state: WorldState, untilMs: number): WorldState {
  if (untilMs <= state.nowMs) return state;

  // 1) Eine zeitsortierte Liste aus Bau-/Rekrut-Events und Flights bauen.
  const events = collectDueEvents(state, untilMs).map((e) => ({ t: e.atMs, kind: "event" as const, payload: e }));
  const flights = collectDueFlights(state, untilMs).map((f) => ({ t: f.arriveMs, kind: "flight" as const, payload: f }));
  const merged = [...events, ...flights].sort((a, b) => a.t - b.t);

  let next = state;
  let villages = { ...next.villages };

  for (const item of merged) {
    if (item.kind === "event") {
      const ev = item.payload;
      if (ev.kind === "troopArrive") continue;
      const v = villages[ev.villageId];
      if (!v) continue;
      const synced: Village = { ...v, resources: resourcesAt(v, ev.atMs, state.config.speed), lastUpdateMs: ev.atMs };
      let updated: Village = synced;
      if (ev.kind === "buildFinish") {
        const order = synced.buildQueue.find((o) => o.building === ev.building && o.toLevel === ev.toLevel && o.finishMs === ev.atMs);
        if (order) updated = applyBuildFinish(synced, order);
      } else if (ev.kind === "recruitTick") {
        const queue = synced.recruitQueues[ev.producer];
        const order = queue.find((o) => o.unit === ev.unit && o.nextFinishMs === ev.atMs);
        if (order) updated = applyRecruitTick(synced, ev.producer, order);
      }
      villages[ev.villageId] = updated;
      next = { ...next, villages };
    } else {
      const flight = item.payload;
      // State muss aktuelle villages haben — reflow.
      next = { ...next, villages };
      if (flight.mode === "attack") {
        next = resolveAttack(next, flight, state.config.moraleEnabled, state.config.nightBonus);
      } else if (flight.mode === "return") {
        next = resolveReturn(next, flight);
      } else {
        // Support noch nicht implementiert — Flight einfach fallenlassen.
        next = { ...next, flights: next.flights.filter((f) => f !== flight) };
      }
      villages = { ...next.villages };
    }
  }

  // Rohstoffe aller Dörfer auf untilMs ziehen.
  for (const id of Object.keys(villages)) {
    const v = villages[id]!;
    villages[id] = { ...v, resources: resourcesAt(v, untilMs, state.config.speed), lastUpdateMs: untilMs };
  }

  return { ...next, nowMs: untilMs, villages };
}
