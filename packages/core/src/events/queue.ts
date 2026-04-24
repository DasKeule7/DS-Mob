import { resourcesAt, storageCapacity } from "../sim/production.js";
import { applyBuildFinish } from "../sim/construction.js";
import { applyRecruitTick } from "../sim/recruitment.js";
import { simulateCombat, computeMorale } from "../sim/combat.js";
import { applyNobleAttack } from "../sim/conquest.js";
import { carryCapacity, travelTimeMs } from "../sim/movement.js";
import { nextFlightId, nextSupportId, mergeSupport } from "../sim/flights.js";
import { UNITS, type UnitId } from "../data/units.js";
import { BARBARIAN_OWNER_ID, type WorldState, type Village, type Flight, type Report, type Resources, type Support, type Player } from "../state/index.js";
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

// Deterministisches PRNG aus einer Flight-ID — stabile Glücks-/Loyalty-Werte.
function mulberryFromString(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mergeUnits(...groups: Array<Partial<Record<UnitId, number>>>): Partial<Record<UnitId, number>> {
  const out: Partial<Record<UnitId, number>> = {};
  for (const g of groups) {
    for (const id of Object.keys(g) as UnitId[]) {
      const n = g[id] ?? 0;
      if (n > 0) out[id] = (out[id] ?? 0) + n;
    }
  }
  return out;
}

// Spielerroster aktualisieren bei Dorfübernahme.
function transferVillageOwnership(state: WorldState, villageId: string, oldOwnerId: string, newOwnerId: string): WorldState {
  const players = { ...state.players };
  if (oldOwnerId !== BARBARIAN_OWNER_ID && players[oldOwnerId]) {
    const p = players[oldOwnerId]!;
    players[oldOwnerId] = { ...p, villageIds: p.villageIds.filter((id) => id !== villageId) };
  }
  if (newOwnerId !== BARBARIAN_OWNER_ID) {
    const p = players[newOwnerId] ?? { id: newOwnerId, name: newOwnerId, villageIds: [], points: 0, noblesProduced: 0 };
    if (!p.villageIds.includes(villageId)) {
      players[newOwnerId] = { ...p, villageIds: [...p.villageIds, villageId] };
    }
  }
  return { ...state, players };
}

function resolveAttack(state: WorldState, flight: Flight, moraleEnabled: boolean, nightBonus: boolean): WorldState {
  const target = state.villages[flight.toVillageId];
  if (!target) return { ...state, flights: state.flights.filter((f) => f !== flight) };
  const source = state.villages[flight.fromVillageId];

  const targetSynced = syncVillage(target, flight.arriveMs, state.config.speed);

  // Verteidigerpool = eigene Truppen + alle Unterstützungen.
  const ownDefense: Partial<Record<UnitId, number>> = {};
  for (const id of Object.keys(targetSynced.units) as UnitId[]) {
    if (targetSynced.units[id] > 0) ownDefense[id] = targetSynced.units[id];
  }
  const supportPools = targetSynced.supports.map((s) => ({ ref: s, units: { ...s.units } }));
  const mergedDefender = mergeUnits(ownDefense, ...supportPools.map((s) => s.units));

  const attackerPoints = playerPointsOf(state, flight.ownerId);
  const defenderPoints = playerPointsOf(state, targetSynced.ownerId);
  const morale = moraleEnabled ? computeMorale(attackerPoints, defenderPoints) : 1;
  const attackHour = new Date(flight.arriveMs).getUTCHours();
  const rand = mulberryFromString(flight.id);
  const luckPercent = Math.round((rand() * 50 - 25) * 10) / 10;

  const combat = simulateCombat(flight.units, mergedDefender, {
    wallLevel: targetSynced.buildings.wall,
    nightBonus,
    attackHour,
    moraleAttacker: morale,
    luckPercent,
  });

  // Verluste proportional auf eigene Truppen + jeden Support verteilen.
  const newOwnUnits = { ...targetSynced.units };
  const newSupports: Support[] = [];
  for (const id of Object.keys(UNITS) as UnitId[]) {
    const initial = mergedDefender[id] ?? 0;
    if (initial <= 0) continue;
    const survived = combat.defenderSurvivors[id] ?? 0;
    const ratio = survived / initial;
    newOwnUnits[id] = Math.round((ownDefense[id] ?? 0) * ratio);
    for (const pool of supportPools) {
      pool.units[id] = Math.round((pool.units[id] ?? 0) * ratio);
    }
  }
  for (const pool of supportPools) {
    const total = Object.values(pool.units).reduce((s, v) => s + (v ?? 0), 0);
    if (total > 0) newSupports.push({ ...pool.ref, units: pool.units });
  }

  // Beute
  let loot: Resources | undefined;
  let newTargetResources = targetSynced.resources;
  if (combat.winner === "attacker") {
    const maxCarry = carryCapacity(combat.attackerSurvivors);
    const pool = targetSynced.resources.wood + targetSynced.resources.stone + targetSynced.resources.iron;
    if (pool > 0) {
      const takeTotal = Math.min(maxCarry, pool);
      const fW = targetSynced.resources.wood / pool;
      const fS = targetSynced.resources.stone / pool;
      const fI = targetSynced.resources.iron / pool;
      const w = Math.floor(takeTotal * fW);
      const s = Math.floor(takeTotal * fS);
      const i = Math.floor(takeTotal * fI);
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

  // Adlung: mind. ein überlebender AG + Sieg des Angreifers → Loyalty drop,
  // ggf. Übernahme. Der übernehmende AG wird "verbraucht" (nicht im Rückflug).
  let loyaltyDrop: number | undefined;
  let loyaltyAfter: number | undefined;
  let takeover = false;
  let updatedTarget: Village = {
    ...targetSynced,
    units: newOwnUnits,
    resources: newTargetResources,
    supports: newSupports,
  };
  const attackerSurvivorsMut: Partial<Record<UnitId, number>> = { ...combat.attackerSurvivors };

  if (combat.winner === "attacker" && (attackerSurvivorsMut.nobleman ?? 0) > 0) {
    const nobleResult = applyNobleAttack(updatedTarget, { rand, newOwnerId: flight.ownerId });
    loyaltyDrop = nobleResult.loyaltyDrop;
    loyaltyAfter = nobleResult.loyaltyAfter;
    updatedTarget = nobleResult.village;
    if (nobleResult.newOwnerId) {
      takeover = true;
      // Ein AG wird verbraucht, Verteidigeranteile werden entfernt (Dorf ist
      // jetzt des Angreifers: keine gegnerischen Truppen mehr vor Ort).
      attackerSurvivorsMut.nobleman = (attackerSurvivorsMut.nobleman ?? 1) - 1;
      updatedTarget = {
        ...updatedTarget,
        units: { ...updatedTarget.units, ...(Object.fromEntries(
          (Object.keys(updatedTarget.units) as UnitId[]).map((id) => [id, 0]),
        ) as Record<UnitId, number>) },
        supports: [],
        buildQueue: [],
        recruitQueues: { ...updatedTarget.recruitQueues, barracks: [], stable: [], garage: [], academy: [], statue: [], farm: [] },
      };
    }
  }

  // Rückflug
  const returnUnits: Partial<Record<UnitId, number>> = {};
  for (const id of Object.keys(attackerSurvivorsMut) as UnitId[]) {
    const n = attackerSurvivorsMut[id] ?? 0;
    if (n > 0) returnUnits[id] = n;
  }
  let newFlights = state.flights.filter((f) => f !== flight);
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
    defenderUnits: mergedDefender,
    attackerSurvivors: combat.attackerSurvivors,
    defenderSurvivors: combat.defenderSurvivors,
    winner: combat.winner,
    ...(loot ? { loot } : {}),
    luckPercent,
    wallLevel: targetSynced.buildings.wall,
    effectiveWallLevel: combat.usedWallLevel,
    read: false,
    ...(loyaltyDrop !== undefined && loyaltyAfter !== undefined ? { loyaltyDrop, loyaltyAfter } : {}),
    ...(takeover ? { takeover: true } : {}),
  };

  let next: WorldState = {
    ...state,
    villages: { ...state.villages, [updatedTarget.id]: updatedTarget },
    flights: newFlights,
    reports: [report, ...state.reports].slice(0, 100),
  };
  if (takeover) next = transferVillageOwnership(next, updatedTarget.id, targetSynced.ownerId, flight.ownerId);
  return next;
}

// Support-Flight kommt an: Truppen wandern in supports[] des Zieldorfs.
function resolveSupport(state: WorldState, flight: Flight): WorldState {
  const host = state.villages[flight.toVillageId];
  if (!host) return { ...state, flights: state.flights.filter((f) => f !== flight) };
  // Einheiten mit 0-Count rausfiltern
  const units: Partial<Record<UnitId, number>> = {};
  for (const id of Object.keys(flight.units) as UnitId[]) {
    const n = flight.units[id] ?? 0;
    if (n > 0) units[id] = n;
  }
  const incoming: Support = {
    id: nextSupportId(),
    ownerId: flight.ownerId,
    fromVillageId: flight.fromVillageId,
    units,
  };
  const newSupports = mergeSupport(host.supports, incoming);
  return {
    ...state,
    villages: { ...state.villages, [host.id]: { ...host, supports: newSupports } },
    flights: state.flights.filter((f) => f !== flight),
  };
}

function resolveReturn(state: WorldState, flight: Flight): WorldState {
  const home = state.villages[flight.toVillageId];
  if (!home || home.ownerId !== flight.ownerId) {
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

// Leichtes Barbaren-Wachstum: alle 3 Stunden +1 Speer (cap 30), nur wenn das
// Dorf seit dem letzten `lastUpdateMs` ungestört blieb und kein Spieler-Dorf ist.
function applyBarbarianGrowth(v: Village, untilMs: number, worldSpeed: number): Village {
  if (v.ownerId !== BARBARIAN_OWNER_ID) return v;
  const deltaH = Math.max(0, (untilMs - v.lastUpdateMs) / 3_600_000) * worldSpeed;
  const grown = Math.floor(deltaH / 3);
  if (grown <= 0) return v;
  const cap = 30;
  const next = Math.min(cap, (v.units.spear ?? 0) + grown);
  if (next === v.units.spear) return v;
  return { ...v, units: { ...v.units, spear: next } };
}

export function advanceTo(state: WorldState, untilMs: number): WorldState {
  if (untilMs <= state.nowMs) return state;

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
      next = { ...next, villages };
      if (flight.mode === "attack") {
        next = resolveAttack(next, flight, state.config.moraleEnabled, state.config.nightBonus);
      } else if (flight.mode === "return") {
        next = resolveReturn(next, flight);
      } else if (flight.mode === "support") {
        next = resolveSupport(next, flight);
      } else if (flight.mode === "recall") {
        next = { ...next, flights: next.flights.filter((f) => f !== flight) };
      }
      villages = { ...next.villages };
    }
  }

  for (const id of Object.keys(villages)) {
    const v = villages[id]!;
    const grown = applyBarbarianGrowth(v, untilMs, state.config.speed);
    villages[id] = { ...grown, resources: resourcesAt(grown, untilMs, state.config.speed), lastUpdateMs: untilMs };
  }

  return { ...next, nowMs: untilMs, villages };
}
