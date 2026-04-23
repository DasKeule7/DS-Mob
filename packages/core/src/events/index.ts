import type { BuildingId } from "../data/buildings.js";
import type { UnitId } from "../data/units.js";

export type GameEvent =
  | { kind: "buildFinish"; atMs: number; villageId: string; building: BuildingId; newLevel: number }
  | { kind: "recruitFinish"; atMs: number; villageId: string; unit: UnitId; count: number }
  | { kind: "troopArrive"; atMs: number; fromVillageId: string; toVillageId: string; units: Partial<Record<UnitId, number>>; attack: boolean };

// Einfache Queue-Abstraktion — Implementierung in Phase 1.
export interface EventQueue {
  enqueue(event: GameEvent): void;
  peek(): GameEvent | undefined;
  pop(): GameEvent | undefined;
  drainUntil(atMs: number): GameEvent[];
}
