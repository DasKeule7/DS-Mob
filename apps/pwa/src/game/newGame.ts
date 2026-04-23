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

// Barbarendorf: einfache Verteidigung + etwas Rohstoffvorrat zum Farmen.
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
  };
}

function generateBarbarians(around: { x: number; y: number }, mapSize: number, nowMs: number): Village[] {
  const villages: Village[] = [];
  const used = new Set<string>([`${around.x},${around.y}`]);
  let safety = 0;
  while (villages.length < BARBARIAN_COUNT && safety < BARBARIAN_COUNT * 20) {
    safety++;
    // 2/3 der Dörfer nah am Spieler, 1/3 weiter entfernt.
    const radius = Math.random() < 0.66 ? 3 + Math.random() * 12 : 10 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.round(around.x + Math.cos(angle) * radius);
    const y = Math.round(around.y + Math.sin(angle) * radius);
    if (x < 1 || y < 1 || x >= mapSize - 1 || y >= mapSize - 1) continue;
    const key = `${x},${y}`;
    if (used.has(key)) continue;
    used.add(key);
    villages.push(makeBarbarian(`v_barb_${villages.length}`, { x, y }, nowMs));
  }
  return villages;
}

export function createNewWorld(opts: { playerName: string; villageName: string; nowMs: number }): WorldState {
  const playerId = "p_me";
  const villageId = "v_me_1";
  const playerCoord = randomStartCoord();
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
  };
  const player: Player = {
    id: playerId,
    name: opts.playerName,
    villageIds: [villageId],
    points: 26,
    noblesProduced: 0,
  };
  const barbarians = generateBarbarians(playerCoord, DEFAULT_MAP_SIZE, opts.nowMs);
  const villages: Record<string, Village> = { [villageId]: village };
  for (const b of barbarians) villages[b.id] = b;
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
    players: { [playerId]: player },
    flights: [],
    reports: [],
  };
}
