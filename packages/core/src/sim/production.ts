import { PRODUCTION_PER_HOUR, STORAGE_CAPACITY } from "../data/production.js";
import type { Resources, Village } from "../state/index.js";

export function productionPerHour(level: number): number {
  const clamped = Math.max(0, Math.min(level, PRODUCTION_PER_HOUR.length - 1));
  return PRODUCTION_PER_HOUR[clamped] ?? 0;
}

export function storageCapacity(level: number): number {
  const clamped = Math.max(0, Math.min(level, STORAGE_CAPACITY.length - 1));
  return STORAGE_CAPACITY[clamped] ?? 0;
}

// Lazy-Evaluation: Rohstoffstand zum Zeitpunkt `nowMs`.
// Kappt bei Speicher-Kapazität.
export function resourcesAt(village: Village, nowMs: number, worldSpeed = 1): Resources {
  const deltaHours = Math.max(0, (nowMs - village.lastUpdateMs) / 3_600_000) * worldSpeed;
  const woodRate  = productionPerHour(village.buildings.wood);
  const stoneRate = productionPerHour(village.buildings.stone);
  const ironRate  = productionPerHour(village.buildings.iron);
  const cap = storageCapacity(village.buildings.storage);
  return {
    wood:  Math.min(cap, village.resources.wood  + woodRate  * deltaHours),
    stone: Math.min(cap, village.resources.stone + stoneRate * deltaHours),
    iron:  Math.min(cap, village.resources.iron  + ironRate  * deltaHours),
  };
}
