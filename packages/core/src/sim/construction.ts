import { BUILDINGS, type BuildingId, type BuildingDef } from "../data/buildings.js";
import type { Resources, Village, BuildOrder } from "../state/index.js";

// Kosten für den Upgrade auf Ziel-Level (1-basiert, also toLevel=1 = Bau auf Lvl 1).
export function buildCost(buildingId: BuildingId, toLevel: number): Resources & { pop: number } {
  const def = BUILDINGS[buildingId];
  const factor = Math.pow(def.costFactor, toLevel - 1);
  return {
    wood: Math.round(def.baseCost.wood * factor),
    stone: Math.round(def.baseCost.stone * factor),
    iron: Math.round(def.baseCost.iron * factor),
    pop: Math.round(def.baseCost.pop * factor),
  };
}

// Bauzeit-Formel (Welt-Speed 1). Klassische Näherung laut Fan-Dokumentationen:
//   t = base * buildTimeFactor^(level-1) * (0.95)^mainLevel
// Das Hauptgebäude beschleunigt damit exponentiell um 5 % pro Level.
// Quelle: reverse-engineerte Formel, z.B. tribalwars.fandom.com/wiki/Buildings
export function buildTimeSeconds(buildingId: BuildingId, toLevel: number, mainLevel: number, worldSpeed = 1): number {
  const def = BUILDINGS[buildingId];
  const raw = def.baseBuildTimeSec * Math.pow(def.buildTimeFactor, toLevel - 1) * Math.pow(0.95, Math.max(0, mainLevel));
  return raw / Math.max(0.01, worldSpeed);
}

export function buildingPoints(buildingId: BuildingId, level: number): number {
  if (level <= 0) return 0;
  const def = BUILDINGS[buildingId];
  return Math.round(def.basePoints * Math.pow(def.pointsFactor, level - 1));
}

export function totalPointsFromBuildings(buildings: Record<BuildingId, number>): number {
  let sum = 0;
  for (const id of Object.keys(buildings) as BuildingId[]) {
    const lvl = buildings[id];
    for (let l = 1; l <= lvl; l++) sum += buildingPoints(id, l);
  }
  return sum;
}

export function definition(buildingId: BuildingId): BuildingDef {
  return BUILDINGS[buildingId];
}

// Level, das nach Abarbeiten aller bereits eingereihten Upgrades erreicht wird.
export function targetLevelInQueue(village: Village, buildingId: BuildingId): number {
  let max = village.buildings[buildingId];
  for (const o of village.buildQueue) if (o.building === buildingId && o.toLevel > max) max = o.toLevel;
  return max;
}

export interface QueueError {
  kind: "maxLevel" | "insufficientResources" | "queueFull" | "buildingMissing" | "invalidState";
  message: string;
}

// Versucht, ein Upgrade einzureihen. Reine Funktion — gibt neuen Village-State
// oder einen Fehler zurück. Ressourcen werden sofort abgezogen (wie im Original).
// Voraussetzung: `village.resources` ist bereits bis `nowMs` aktualisiert.
export function enqueueBuild(
  village: Village,
  buildingId: BuildingId,
  nowMs: number,
  options: { maxQueueSize?: number; worldSpeed?: number } = {},
): { ok: true; village: Village; order: BuildOrder } | { ok: false; error: QueueError } {
  const maxQueueSize = options.maxQueueSize ?? 2;
  if (village.buildQueue.length >= maxQueueSize) {
    return { ok: false, error: { kind: "queueFull", message: "Bauschleife ist voll." } };
  }
  const def = BUILDINGS[buildingId];
  const nextLevel = targetLevelInQueue(village, buildingId) + 1;
  if (nextLevel > def.maxLevel) {
    return { ok: false, error: { kind: "maxLevel", message: `${buildingId} ist bereits auf Maximal-Level.` } };
  }
  const cost = buildCost(buildingId, nextLevel);
  if (
    village.resources.wood < cost.wood ||
    village.resources.stone < cost.stone ||
    village.resources.iron < cost.iron
  ) {
    return { ok: false, error: { kind: "insufficientResources", message: "Nicht genug Rohstoffe." } };
  }
  const lastFinish = village.buildQueue.at(-1)?.finishMs ?? nowMs;
  const mainLevel = village.buildings.main;
  const durationMs = buildTimeSeconds(buildingId, nextLevel, mainLevel, options.worldSpeed) * 1000;
  const order: BuildOrder = {
    building: buildingId,
    toLevel: nextLevel,
    startMs: lastFinish,
    finishMs: lastFinish + durationMs,
  };
  const newVillage: Village = {
    ...village,
    resources: {
      wood: village.resources.wood - cost.wood,
      stone: village.resources.stone - cost.stone,
      iron: village.resources.iron - cost.iron,
    },
    buildQueue: [...village.buildQueue, order],
  };
  return { ok: true, village: newVillage, order };
}

// Abbruch eines noch nicht fertigen Auftrags. Gibt 100 % der Kosten zurück,
// solange Bau noch nicht fertig ist (vereinfachte Regel — im Original werden
// ~90 % erstattet; wir belassen es bei 100 %, anpassbar).
export function cancelBuild(village: Village, queueIndex: number): Village {
  const order = village.buildQueue[queueIndex];
  if (!order) return village;
  const refund = buildCost(order.building, order.toLevel);
  const newQueue = village.buildQueue.filter((_, i) => i !== queueIndex);
  return {
    ...village,
    resources: {
      wood: village.resources.wood + refund.wood,
      stone: village.resources.stone + refund.stone,
      iron: village.resources.iron + refund.iron,
    },
    buildQueue: newQueue,
  };
}

// Ein einzelnes Bau-Event "finalisieren" — wird vom Event-Prozessor gerufen.
export function applyBuildFinish(village: Village, order: BuildOrder): Village {
  return {
    ...village,
    buildings: { ...village.buildings, [order.building]: order.toLevel },
    buildQueue: village.buildQueue.filter((o) => o !== order),
  };
}
