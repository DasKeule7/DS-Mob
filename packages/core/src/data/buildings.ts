// Gebäude-Stammdaten. Zahlen stammen aus help.tribalwars.net /
// help.die-staemme.de (Welt 1 / klassische Welten). Werden in Phase 1
// Schritt für Schritt mit Tests gegen die Wiki-Tabellen verifiziert.

export type BuildingId =
  | "main"
  | "barracks"
  | "stable"
  | "garage"
  | "academy"
  | "smithy"
  | "rally"
  | "statue"
  | "market"
  | "wood"
  | "stone"
  | "iron"
  | "farm"
  | "storage"
  | "hide"
  | "wall"
  | "church"
  | "watchtower";

export interface BuildingDef {
  readonly id: BuildingId;
  readonly maxLevel: number;
  readonly baseCost: { wood: number; stone: number; iron: number; pop: number };
  readonly costFactor: number;
  readonly baseBuildTimeSec: number;
  readonly buildTimeFactor: number;
  readonly basePoints: number;
  readonly pointsFactor: number;
}

// Platzhalter-Werte — werden in Phase 1 mit den genauen Tabellen aus dem Wiki
// pro Gebäude individuell gefüllt und per Unit-Test validiert.
export const BUILDINGS: Readonly<Record<BuildingId, BuildingDef>> = {
  main: { id: "main", maxLevel: 30, baseCost: { wood: 90, stone: 80, iron: 70, pop: 5 }, costFactor: 1.26, baseBuildTimeSec: 900, buildTimeFactor: 1.2, basePoints: 10, pointsFactor: 1.2 },
  barracks: { id: "barracks", maxLevel: 25, baseCost: { wood: 200, stone: 170, iron: 90, pop: 7 }, costFactor: 1.26, baseBuildTimeSec: 1800, buildTimeFactor: 1.2, basePoints: 16, pointsFactor: 1.2 },
  stable: { id: "stable", maxLevel: 20, baseCost: { wood: 270, stone: 240, iron: 260, pop: 8 }, costFactor: 1.26, baseBuildTimeSec: 6000, buildTimeFactor: 1.2, basePoints: 20, pointsFactor: 1.2 },
  garage: { id: "garage", maxLevel: 15, baseCost: { wood: 300, stone: 240, iron: 260, pop: 8 }, costFactor: 1.26, baseBuildTimeSec: 6000, buildTimeFactor: 1.2, basePoints: 24, pointsFactor: 1.2 },
  academy: { id: "academy", maxLevel: 3, baseCost: { wood: 15000, stone: 25000, iron: 10000, pop: 80 }, costFactor: 1.26, baseBuildTimeSec: 907200, buildTimeFactor: 1.2, basePoints: 160, pointsFactor: 1.2 },
  smithy: { id: "smithy", maxLevel: 20, baseCost: { wood: 220, stone: 180, iron: 240, pop: 20 }, costFactor: 1.26, baseBuildTimeSec: 6000, buildTimeFactor: 1.2, basePoints: 20, pointsFactor: 1.2 },
  rally: { id: "rally", maxLevel: 1, baseCost: { wood: 110, stone: 160, iron: 90, pop: 0 }, costFactor: 1, baseBuildTimeSec: 1800, buildTimeFactor: 1, basePoints: 0, pointsFactor: 1 },
  statue: { id: "statue", maxLevel: 1, baseCost: { wood: 220, stone: 220, iron: 220, pop: 10 }, costFactor: 1, baseBuildTimeSec: 1500, buildTimeFactor: 1, basePoints: 14, pointsFactor: 1 },
  market: { id: "market", maxLevel: 25, baseCost: { wood: 100, stone: 100, iron: 100, pop: 20 }, costFactor: 1.26, baseBuildTimeSec: 2700, buildTimeFactor: 1.2, basePoints: 10, pointsFactor: 1.2 },
  wood: { id: "wood", maxLevel: 30, baseCost: { wood: 50, stone: 60, iron: 40, pop: 5 }, costFactor: 1.25, baseBuildTimeSec: 900, buildTimeFactor: 1.2, basePoints: 6, pointsFactor: 1.2 },
  stone: { id: "stone", maxLevel: 30, baseCost: { wood: 65, stone: 50, iron: 40, pop: 10 }, costFactor: 1.25, baseBuildTimeSec: 900, buildTimeFactor: 1.2, basePoints: 6, pointsFactor: 1.2 },
  iron: { id: "iron", maxLevel: 30, baseCost: { wood: 75, stone: 65, iron: 70, pop: 10 }, costFactor: 1.25, baseBuildTimeSec: 1080, buildTimeFactor: 1.2, basePoints: 6, pointsFactor: 1.2 },
  farm: { id: "farm", maxLevel: 30, baseCost: { wood: 45, stone: 40, iron: 30, pop: 0 }, costFactor: 1.3, baseBuildTimeSec: 1200, buildTimeFactor: 1.2, basePoints: 6, pointsFactor: 1.2 },
  storage: { id: "storage", maxLevel: 30, baseCost: { wood: 60, stone: 50, iron: 40, pop: 0 }, costFactor: 1.265, baseBuildTimeSec: 1020, buildTimeFactor: 1.2, basePoints: 6, pointsFactor: 1.2 },
  hide: { id: "hide", maxLevel: 10, baseCost: { wood: 50, stone: 60, iron: 50, pop: 2 }, costFactor: 1.25, baseBuildTimeSec: 1800, buildTimeFactor: 1.2, basePoints: 2, pointsFactor: 1.2 },
  wall: { id: "wall", maxLevel: 20, baseCost: { wood: 50, stone: 100, iron: 20, pop: 5 }, costFactor: 1.26, baseBuildTimeSec: 3600, buildTimeFactor: 1.2, basePoints: 8, pointsFactor: 1.2 },
  church: { id: "church", maxLevel: 3, baseCost: { wood: 16000, stone: 20000, iron: 5000, pop: 100 }, costFactor: 1.6, baseBuildTimeSec: 172800, buildTimeFactor: 1.2, basePoints: 100, pointsFactor: 1.2 },
  watchtower: { id: "watchtower", maxLevel: 20, baseCost: { wood: 12000, stone: 14000, iron: 12000, pop: 50 }, costFactor: 1.17, baseBuildTimeSec: 13200, buildTimeFactor: 1.2, basePoints: 80, pointsFactor: 1.2 },
};
