import { EMPTY_RECRUIT_QUEUES, type Village, type WorldState } from "../src/state/index.js";

export function makeVillage(overrides: Partial<Village> = {}): Village {
  return {
    id: "v1",
    ownerId: "p1",
    coord: { x: 500, y: 500 },
    name: "Testdorf",
    buildings: {
      main: 1, barracks: 0, stable: 0, garage: 0, academy: 0, smithy: 0, rally: 1,
      statue: 0, market: 0, wood: 1, stone: 1, iron: 1, farm: 1, storage: 1, hide: 0,
      wall: 0, church: 0, watchtower: 0,
    },
    units: {
      spear: 0, sword: 0, axe: 0, archer: 0, scout: 0, lightCav: 0, mountedArcher: 0,
      heavyCav: 0, ram: 0, catapult: 0, paladin: 0, nobleman: 0, militia: 0,
    },
    resources: { wood: 10_000, stone: 10_000, iron: 10_000 },
    lastUpdateMs: 0,
    loyalty: 100,
    buildQueue: [],
    recruitQueues: { ...EMPTY_RECRUIT_QUEUES },
    mintedCoins: 0,
    ...overrides,
  };
}

export function makeWorld(villages: Village[]): WorldState {
  return {
    config: { speed: 1, unitSpeed: 1, nightBonus: true, moraleEnabled: true, bonusVillages: false, mapSize: 1000 },
    nowMs: 0,
    villages: Object.fromEntries(villages.map((v) => [v.id, v])),
    players: {},
  };
}

// Deterministisches PRNG für reproduzierbare Tests (mulberry32).
export function makeRand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
