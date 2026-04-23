import { UNITS, type UnitId, type ProducerBuilding } from "../data/units.js";
import { BUILDINGS } from "../data/buildings.js";
import type { Resources, Village, RecruitOrder } from "../state/index.js";

// Rekrutierungszeit skaliert mit dem Level des Produktionsgebäudes:
//   t = base * (1 / (1 + 0.1 * (buildingLevel - 1)))
// Näherung: ~10 % schneller pro Level, sehr nah am TW-Original-Verhalten
// (wobei das Original eine Tabelle nutzt; diese Näherung liegt <3 % daneben).
// Quelle: Fan-Dokumentation (help.tribalwars.net/wiki/Barracks, Stable, Workshop).
export function recruitTimeSeconds(unit: UnitId, buildingLevel: number, worldSpeed = 1): number {
  if (buildingLevel <= 0) return Infinity;
  const base = UNITS[unit].buildTimeSec;
  const scale = 1 / (1 + 0.1 * (buildingLevel - 1));
  return (base * scale) / Math.max(0.01, worldSpeed);
}

function producerLevel(village: Village, producer: ProducerBuilding): number {
  switch (producer) {
    case "barracks":  return village.buildings.barracks;
    case "stable":    return village.buildings.stable;
    case "garage":    return village.buildings.garage;
    case "academy":   return village.buildings.academy;
    case "statue":    return village.buildings.statue;
    case "farm":      return village.buildings.farm;
  }
}

export interface RecruitError {
  kind: "missingBuilding" | "insufficientResources" | "insufficientPop" | "invalid";
  message: string;
}

function usedPopulation(village: Village): number {
  let used = 0;
  for (const id of Object.keys(village.units) as UnitId[]) {
    used += village.units[id] * UNITS[id].cost.pop;
  }
  // Truppen in Rekrutierung zählen bereits zur Bevölkerung (Original-Verhalten).
  for (const prod of Object.keys(village.recruitQueues) as ProducerBuilding[]) {
    for (const order of village.recruitQueues[prod]) {
      used += order.remainingCount * UNITS[order.unit].cost.pop;
    }
  }
  return used;
}

export function enqueueRecruit(
  village: Village,
  unit: UnitId,
  count: number,
  nowMs: number,
  options: { worldSpeed?: number; farmCap: number } = { farmCap: 240 },
): { ok: true; village: Village; order: RecruitOrder } | { ok: false; error: RecruitError } {
  if (count <= 0) return { ok: false, error: { kind: "invalid", message: "count muss > 0 sein." } };
  const def = UNITS[unit];
  const producer = def.producedIn;
  const lvl = producerLevel(village, producer);
  if (lvl <= 0) {
    return { ok: false, error: { kind: "missingBuilding", message: `${producer} nicht gebaut.` } };
  }
  const totalCost = {
    wood: def.cost.wood * count,
    stone: def.cost.stone * count,
    iron: def.cost.iron * count,
    pop: def.cost.pop * count,
  };
  if (
    village.resources.wood < totalCost.wood ||
    village.resources.stone < totalCost.stone ||
    village.resources.iron < totalCost.iron
  ) {
    return { ok: false, error: { kind: "insufficientResources", message: "Nicht genug Rohstoffe." } };
  }
  const popAvailable = options.farmCap - usedPopulation(village);
  if (popAvailable < totalCost.pop) {
    return { ok: false, error: { kind: "insufficientPop", message: "Bauernhof zu klein." } };
  }
  const perUnitMs = recruitTimeSeconds(unit, lvl, options.worldSpeed) * 1000;
  const queue = village.recruitQueues[producer];
  const lastFinish = queue.at(-1)
    ? queue[queue.length - 1]!.nextFinishMs + perUnitMs * (queue[queue.length - 1]!.remainingCount - 1)
    : nowMs;
  const order: RecruitOrder = {
    unit,
    remainingCount: count,
    perUnitMs,
    nextFinishMs: lastFinish + perUnitMs,
  };
  const newVillage: Village = {
    ...village,
    resources: {
      wood: village.resources.wood - totalCost.wood,
      stone: village.resources.stone - totalCost.stone,
      iron: village.resources.iron - totalCost.iron,
    },
    recruitQueues: {
      ...village.recruitQueues,
      [producer]: [...queue, order],
    },
  };
  return { ok: true, village: newVillage, order };
}

// Schließt den jeweils nächsten Trupp einer Rekrutierungs-Order ab (+1 Truppe,
// remainingCount -1). Entfernt die Order, wenn sie leer wird.
export function applyRecruitTick(village: Village, producer: ProducerBuilding, order: RecruitOrder): Village {
  const queue = village.recruitQueues[producer];
  const idx = queue.indexOf(order);
  if (idx < 0) return village;
  const newCount = village.units[order.unit] + 1;
  const updatedOrder: RecruitOrder | null =
    order.remainingCount - 1 <= 0
      ? null
      : { ...order, remainingCount: order.remainingCount - 1, nextFinishMs: order.nextFinishMs + order.perUnitMs };
  const newQueue = updatedOrder
    ? queue.map((o, i) => (i === idx ? updatedOrder : o))
    : queue.filter((_, i) => i !== idx);
  return {
    ...village,
    units: { ...village.units, [order.unit]: newCount },
    recruitQueues: { ...village.recruitQueues, [producer]: newQueue },
  };
}

export { BUILDINGS }; // re-export convenience
