import { resourcesAt } from "../sim/production.js";
import { applyBuildFinish } from "../sim/construction.js";
import { applyRecruitTick } from "../sim/recruitment.js";
import type { WorldState, Village } from "../state/index.js";
import type { GameEvent } from "./index.js";

// Sammelt alle fälligen Events aller Dörfer bis `untilMs` in sortierter Reihenfolge.
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
        // Jede Truppe erzeugt ein eigenes Event.
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

// Spult den Welt-Zustand von `state.nowMs` auf `untilMs` vor:
//   1. Alle fälligen Bau-/Rekrutierungs-Events deterministisch anwenden.
//   2. Danach Rohstoffe aller Dörfer bis `untilMs` nachberechnen.
// Reine Funktion — mutiert nichts.
export function advanceTo(state: WorldState, untilMs: number): WorldState {
  if (untilMs <= state.nowMs) return state;
  const events = collectDueEvents(state, untilMs);

  let villages = { ...state.villages };

  for (const ev of events) {
    if (ev.kind === "troopArrive") continue; // Phase 3
    const v = villages[ev.villageId];
    if (!v) continue;
    // Vor dem Event Rohstoffe bis zum Event-Zeitpunkt synchronisieren —
    // wichtig, damit z.B. ein Bauende nicht fälschlich auf "vorher-Ressourcen" basiert.
    const synced: Village = {
      ...v,
      resources: resourcesAt(v, ev.atMs, state.config.speed),
      lastUpdateMs: ev.atMs,
    };
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
  }

  // Rohstoffe für alle Dörfer auf untilMs ziehen.
  for (const id of Object.keys(villages)) {
    const v = villages[id]!;
    villages[id] = {
      ...v,
      resources: resourcesAt(v, untilMs, state.config.speed),
      lastUpdateMs: untilMs,
    };
  }

  return { ...state, nowMs: untilMs, villages };
}
