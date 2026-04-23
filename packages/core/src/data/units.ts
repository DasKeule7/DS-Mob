// Einheiten-Stammdaten (Welt 1 / klassisch). Quellen:
// https://help.tribalwars.net/wiki/Units
// https://www.twstats.com/index.php?page=article&id=24

export type ProducerBuilding = "barracks" | "stable" | "garage" | "academy" | "statue" | "farm";

export type UnitId =
  | "spear"
  | "sword"
  | "axe"
  | "archer"
  | "scout"
  | "lightCav"
  | "mountedArcher"
  | "heavyCav"
  | "ram"
  | "catapult"
  | "paladin"
  | "nobleman"
  | "militia";

// Für die Kampfformel: Kategorie bestimmt, welche Verteidigung greift.
// - infantry: allgemeine Verteidigung
// - cavalry:  Kavallerie-Verteidigung
// - archer:   Bogen-Verteidigung (auf Welten mit Bogen)
// siege / special werden anteilig mit "infantry" gewertet.
export type UnitCategory = "infantry" | "cavalry" | "archer" | "siege" | "special";

export interface UnitDef {
  readonly id: UnitId;
  readonly cost: { wood: number; stone: number; iron: number; pop: number };
  readonly attack: number;
  readonly defense: { general: number; cavalry: number; archer: number };
  readonly speedMinPerField: number;
  readonly carry: number;
  readonly buildTimeSec: number;
  readonly producedIn: ProducerBuilding;
  readonly category: UnitCategory;
}

export const UNITS: Readonly<Record<UnitId, UnitDef>> = {
  spear:         { id: "spear",         cost: { wood:   50, stone:   30, iron:  10, pop:   1 }, attack:  10, defense: { general:  15, cavalry:  45, archer:  20 }, speedMinPerField: 18, carry:  25, buildTimeSec:  1020, producedIn: "barracks", category: "infantry" },
  sword:         { id: "sword",         cost: { wood:   30, stone:   30, iron:  70, pop:   1 }, attack:  25, defense: { general:  50, cavalry:  15, archer:  40 }, speedMinPerField: 22, carry:  15, buildTimeSec:  1500, producedIn: "barracks", category: "infantry" },
  axe:           { id: "axe",           cost: { wood:   60, stone:   30, iron:  40, pop:   1 }, attack:  40, defense: { general:  10, cavalry:   5, archer:  10 }, speedMinPerField: 18, carry:  10, buildTimeSec:  1320, producedIn: "barracks", category: "infantry" },
  archer:        { id: "archer",        cost: { wood:  100, stone:   30, iron:  60, pop:   1 }, attack:  15, defense: { general:  50, cavalry:  40, archer:   5 }, speedMinPerField: 18, carry:  10, buildTimeSec:  1800, producedIn: "barracks", category: "archer" },
  scout:         { id: "scout",         cost: { wood:   50, stone:   50, iron:  20, pop:   2 }, attack:   0, defense: { general:   2, cavalry:   1, archer:   2 }, speedMinPerField:  9, carry:   0, buildTimeSec:   900, producedIn: "stable",   category: "cavalry" },
  lightCav:      { id: "lightCav",      cost: { wood:  125, stone:  100, iron: 250, pop:   4 }, attack: 130, defense: { general:  30, cavalry:  40, archer:  30 }, speedMinPerField: 10, carry:  80, buildTimeSec:  6000, producedIn: "stable",   category: "cavalry" },
  mountedArcher: { id: "mountedArcher", cost: { wood:  250, stone:  100, iron: 150, pop:   5 }, attack: 120, defense: { general:  40, cavalry:  30, archer:  50 }, speedMinPerField: 10, carry:  50, buildTimeSec:  6600, producedIn: "stable",   category: "archer" },
  heavyCav:      { id: "heavyCav",      cost: { wood:  200, stone:  150, iron: 600, pop:   6 }, attack: 150, defense: { general: 200, cavalry:  80, archer: 180 }, speedMinPerField: 11, carry:  50, buildTimeSec:  9000, producedIn: "stable",   category: "cavalry" },
  ram:           { id: "ram",           cost: { wood:  300, stone:  200, iron: 200, pop:   5 }, attack:   2, defense: { general:  20, cavalry:  50, archer:  20 }, speedMinPerField: 30, carry:   0, buildTimeSec:  4800, producedIn: "garage",   category: "siege" },
  catapult:      { id: "catapult",      cost: { wood:  320, stone:  400, iron: 100, pop:   8 }, attack: 100, defense: { general: 100, cavalry:  50, archer: 100 }, speedMinPerField: 30, carry:   0, buildTimeSec:  7200, producedIn: "garage",   category: "siege" },
  paladin:       { id: "paladin",       cost: { wood:   20, stone:   20, iron:  40, pop:  10 }, attack: 150, defense: { general: 250, cavalry: 400, archer: 150 }, speedMinPerField: 10, carry: 100, buildTimeSec: 18000, producedIn: "statue",   category: "cavalry" },
  nobleman:      { id: "nobleman",      cost: { wood:40000, stone:50000, iron:50000, pop: 100 }, attack:  30, defense: { general: 100, cavalry:  50, archer: 100 }, speedMinPerField: 35, carry:   0, buildTimeSec: 64800, producedIn: "academy",  category: "special" },
  militia:       { id: "militia",       cost: { wood:    0, stone:    0, iron:   0, pop:   0 }, attack:   0, defense: { general:  15, cavalry:  45, archer:  25 }, speedMinPerField:  0, carry:   0, buildTimeSec:     0, producedIn: "farm",     category: "infantry" },
};
