import {
  EMPTY_RECRUIT_QUEUES,
  type WorldState,
  type Village,
  type Player,
} from "@ds-mob/core";

const DEFAULT_MAP_SIZE = 200;

export function randomStartCoord(size: number = DEFAULT_MAP_SIZE): { x: number; y: number } {
  const margin = Math.floor(size * 0.1);
  const x = margin + Math.floor(Math.random() * (size - margin * 2));
  const y = margin + Math.floor(Math.random() * (size - margin * 2));
  return { x, y };
}

export function createNewWorld(opts: { playerName: string; villageName: string; nowMs: number }): WorldState {
  const playerId = "p_me";
  const villageId = "v_me_1";
  const village: Village = {
    id: villageId,
    ownerId: playerId,
    coord: randomStartCoord(),
    name: opts.villageName,
    buildings: {
      main: 3, barracks: 0, stable: 0, garage: 0, academy: 0, smithy: 0, rally: 1,
      statue: 0, market: 0, wood: 1, stone: 1, iron: 1, farm: 1, storage: 1, hide: 0,
      wall: 0, church: 0, watchtower: 0,
    },
    units: {
      spear: 0, sword: 0, axe: 0, archer: 0, scout: 0, lightCav: 0, mountedArcher: 0,
      heavyCav: 0, ram: 0, catapult: 0, paladin: 0, nobleman: 0, militia: 0,
    },
    resources: { wood: 500, stone: 500, iron: 500 },
    lastUpdateMs: opts.nowMs,
    loyalty: 100,
    buildQueue: [],
    recruitQueues: { ...EMPTY_RECRUIT_QUEUES },
    mintedCoins: 0,
  };
  const player: Player = {
    id: playerId,
    name: opts.playerName,
    villageIds: [villageId],
    points: 0,
    noblesProduced: 0,
  };
  return {
    config: {
      speed: 1,
      unitSpeed: 1,
      nightBonus: true,
      moraleEnabled: true,
      bonusVillages: false,
      mapSize: DEFAULT_MAP_SIZE,
    },
    nowMs: opts.nowMs,
    villages: { [villageId]: village },
    players: { [playerId]: player },
  };
}
