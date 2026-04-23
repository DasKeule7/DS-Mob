import type { BuildingId } from "../data/buildings.js";
import type { UnitId, ProducerBuilding } from "../data/units.js";

export interface Resources {
  wood: number;
  stone: number;
  iron: number;
}

export interface Coord {
  x: number;
  y: number;
}

export interface BuildOrder {
  building: BuildingId;
  toLevel: number;
  startMs: number;
  finishMs: number;
}

export interface RecruitOrder {
  unit: UnitId;
  remainingCount: number;
  perUnitMs: number;
  nextFinishMs: number;
}

export type RecruitQueues = Record<ProducerBuilding, RecruitOrder[]>;

export const EMPTY_RECRUIT_QUEUES: RecruitQueues = {
  barracks: [],
  stable: [],
  garage: [],
  academy: [],
  statue: [],
  farm: [],
};

export interface Village {
  id: string;
  ownerId: string;
  coord: Coord;
  name: string;
  buildings: Record<BuildingId, number>;
  units: Record<UnitId, number>;
  resources: Resources;
  lastUpdateMs: number;
  loyalty: number;
  buildQueue: BuildOrder[];
  recruitQueues: RecruitQueues;
  mintedCoins: number;
}

export interface Player {
  id: string;
  name: string;
  villageIds: string[];
  points: number;
  noblesProduced: number;
}

export interface WorldConfig {
  speed: number;
  unitSpeed: number;
  nightBonus: boolean;
  moraleEnabled: boolean;
  bonusVillages: boolean;
  mapSize: number;
}

export interface WorldState {
  config: WorldConfig;
  nowMs: number;
  villages: Record<string, Village>;
  players: Record<string, Player>;
}
