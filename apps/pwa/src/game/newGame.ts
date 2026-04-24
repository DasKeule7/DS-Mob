import {
  BARBARIAN_OWNER_ID,
  EMPTY_RECRUIT_QUEUES,
  type WorldState,
  type Village,
  type Player,
  type Resources,
} from "@ds-mob/core";

const DEFAULT_MAP_SIZE = 200;
const BARBARIAN_COUNT = 60;
const AI_PLAYER_COUNT = 3;

const AI_NAMES = ["Grüne Banditen", "Blaue Wölfe", "Rote Raben", "Gelbe Geier", "Schwarze Bären"];

export function randomStartCoord(size: number = DEFAULT_MAP_SIZE): { x: number; y: number } {
  const margin = Math.floor(size * 0.1);
  const x = margin + Math.floor(Math.random() * (size - margin * 2));
  const y = margin + Math.floor(Math.random() * (size - margin * 2));
  return { x, y };
}

function defaultBuildings() {
  return {
    main: 1, barracks: 0, stable: 0, garage: 0, academy: 0, smithy: 0, rally: 1,
    statue: 0, market: 0, wood: 1, stone: 1, iron: 1, farm: 1, storage: 1, hide: 0,
    wall: 0, church: 0, watchtower: 0,
  } as const;
}

function emptyUnits() {
  return {
    spear: 0, sword: 0, axe: 0, archer: 0, scout: 0, lightCav: 0, mountedArcher: 0,
    heavyCav: 0, ram: 0, catapult: 0, paladin: 0, nobleman: 0, militia: 0,
  } as const;
}

function makeBarbarian(id: string, coord: { x: number; y: number }, nowMs: number): Village {
  const wood = 300 + Math.floor(Math.random() * 700);
  const stone = 300 + Math.floor(Math.random() * 700);
  const iron = 200 + Math.floor(Math.random() * 600);
  const resources: Resources = { wood, stone, iron };
  const spear = 5 + Math.floor(Math.random() * 25);
  return {
    id,
    ownerId: BARBARIAN_OWNER_ID,
    coord,
    name: "Barbarendorf",
    buildings: { ...defaultBuildings(), wall: Math.random() < 0.35 ? 1 : 0 },
    units: { ...emptyUnits(), spear },
    resources,
    lastUpdateMs: nowMs,
    loyalty: 100,
    buildQueue: [],
    recruitQueues: { ...EMPTY_RECRUIT_QUEUES },
    mintedCoins: 0,
    supports: [],
  };
}

function makeAiVillage(id: string, ownerId: string, coord: { x: number; y: number }, nowMs: number): Village {
  return {
    id,
    ownerId,
    coord,
    name: "Dorf des Feindes",
    buildings: { ...defaultBuildings(), main: 5, barracks: 2, wood: 5, stone: 5, iron: 5, farm: 4, storage: 3, wall: 2 },
    units: { ...emptyUnits(), spear: 60 + Math.floor(Math.random() * 60), sword: 30 + Math.floor(Math.random() * 30) },
    resources: { wood: 1500, stone: 1500, iron: 1000 },
    lastUpdateMs: nowMs,
    loyalty: 100,
    buildQueue: [],
    recruitQueues: { ...EMPTY_RECRUIT_QUEUES },
    mintedCoins: 0,
    supports: [],
  };
}

function usedCoord(used: Set<string>, x: number, y: number): boolean {
  return used.has(`${x},${y}`);
}

function placeNear(around: { x: number; y: number }, mapSize: number, used: Set<string>, radius: [number, number]): { x: number; y: number } | null {
  for (let i = 0; i < 80; i++) {
    const r = radius[0] + Math.random() * (radius[1] - radius[0]);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.round(around.x + Math.cos(angle) * r);
    const y = Math.round(around.y + Math.sin(angle) * r);
    if (x < 1 || y < 1 || x >= mapSize - 1 || y >= mapSize - 1) continue;
    if (usedCoord(used, x, y)) continue;
    used.add(`${x},${y}`);
    return { x, y };
  }
  return null;
}

function generateBarbarians(around: { x: number; y: number }, mapSize: number, used: Set<string>, nowMs: number): Village[] {
  const villages: Village[] = [];
  let safety = 0;
  while (villages.length < BARBARIAN_COUNT && safety < BARBARIAN_COUNT * 20) {
    safety++;
    const radius: [number, number] = Math.random() < 0.66 ? [3, 15] : [10, 50];
    const pos = placeNear(around, mapSize, used, radius);
    if (!pos) continue;
    villages.push(makeBarbarian(`v_barb_${villages.length}`, pos, nowMs));
  }
  return villages;
}

interface AiGenOut {
  villages: Village[];
  players: Player[];
}

function generateAiPlayers(around: { x: number; y: number }, mapSize: number, used: Set<string>, nowMs: number): AiGenOut {
  const villages: Village[] = [];
  const players: Player[] = [];
  for (let i = 0; i < AI_PLAYER_COUNT; i++) {
    const pos = placeNear(around, mapSize, used, [20, 60]);
    if (!pos) continue;
    const id = `p_ai_${i}`;
    const villageId = `v_ai_${i}`;
    villages.push(makeAiVillage(villageId, id, pos, nowMs));
    players.push({
      id,
      name: AI_NAMES[i] ?? `KI ${i + 1}`,
      villageIds: [villageId],
      points: 200 + Math.floor(Math.random() * 400),
      noblesProduced: 0,
      research: {},
    });
  }
  return { villages, players };
}

export function createNewWorld(opts: { playerName: string; villageName: string; nowMs: number }): WorldState {
  const playerId = "p_me";
  const villageId = "v_me_1";
  const playerCoord = randomStartCoord();
  const used = new Set<string>([`${playerCoord.x},${playerCoord.y}`]);
  const village: Village = {
    id: villageId,
    ownerId: playerId,
    coord: playerCoord,
    name: opts.villageName,
    buildings: { ...defaultBuildings(), main: 3 },
    units: { ...emptyUnits() },
    resources: { wood: 500, stone: 500, iron: 500 },
    lastUpdateMs: opts.nowMs,
    loyalty: 100,
    buildQueue: [],
    recruitQueues: { ...EMPTY_RECRUIT_QUEUES },
    mintedCoins: 0,
    supports: [],
  };
  const player: Player = {
    id: playerId,
    name: opts.playerName,
    villageIds: [villageId],
    points: 26,
    noblesProduced: 0,
    research: {},
  };
  const barbarians = generateBarbarians(playerCoord, DEFAULT_MAP_SIZE, used, opts.nowMs);
  const ai = generateAiPlayers(playerCoord, DEFAULT_MAP_SIZE, used, opts.nowMs);
  const villages: Record<string, Village> = { [villageId]: village };
  for (const b of barbarians) villages[b.id] = b;
  for (const a of ai.villages) villages[a.id] = a;
  const players: Record<string, Player> = { [playerId]: player };
  for (const p of ai.players) players[p.id] = p;
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
    villages,
    players,
    flights: [],
    reports: [],
  };
}
