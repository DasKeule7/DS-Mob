import type { BuildingId } from "../data/buildings.js";
import type { UnitId, ProducerBuilding } from "../data/units.js";

export type GameEvent =
  | { kind: "buildFinish"; atMs: number; villageId: string; building: BuildingId; toLevel: number }
  | { kind: "recruitTick"; atMs: number; villageId: string; producer: ProducerBuilding; unit: UnitId }
  | { kind: "troopArrive"; atMs: number; fromVillageId: string; toVillageId: string; units: Partial<Record<UnitId, number>>; mode: "attack" | "support" | "return" };

export function compareEvents(a: GameEvent, b: GameEvent): number {
  return a.atMs - b.atMs;
}

export * from "./queue.js";
