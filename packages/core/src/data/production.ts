// Produktionswerte pro Minenlevel (Holz / Lehm / Eisen je identisch), Welt-
// Geschwindigkeit 1.0. Quelle: forum.tribalwars.net "table-for-resources-hour"
// + fandom wiki. Levels 0–30 in Rohstoffen pro Stunde.
export const PRODUCTION_PER_HOUR: readonly number[] = [
  5,    // level 0 (Basisproduktion, auch wenn Mine fehlt)
  30,   35,   41,   47,   55,   64,   74,   86,   100,  117,
  136,  158,  184,  214,  249,  289,  337,  391,  455,  530,
  616,  717,  833,  969,  1127, 1311, 1525, 1774, 2063, 2400,
];

// Speicherkapazität pro Level (beide Ressourcen-Slots gleich). Wird in Phase 1
// gegen Wiki-Tabelle verifiziert.
export const STORAGE_CAPACITY: readonly number[] = [
  1000,
  1000,  1229,  1512,  1859,  2285,  2810,  3454,  4247,  5222,  6420,
  7893,  9705,  11932, 14670, 18037, 22177, 27266, 33523, 41217, 50676,
  62305, 76604, 94184, 115798,142379,175082,215247,264611,325336,400000,
];

// Bauernhofkapazität pro Level.
export const FARM_CAPACITY: readonly number[] = [
  240,
  240,   281,   329,   385,   450,   527,   616,   721,   843,   986,
  1153,  1349,  1578,  1845,  2158,  2524,  2952,  3453,  4039,  4724,
  5525,  6462,  7558,  8840,  10340, 12093, 14143, 16541, 19345, 24000,
];

// Anzahl Händler pro Marktplatz-Level.
export const MARKET_TRADERS: readonly number[] = [
  0,
  1,  2,  3,  4,  5,  7,  9,  11, 13, 15,
  18, 21, 24, 27, 30, 34, 38, 42, 47, 52,
  58, 64, 70, 77, 85, 93,
];

// Wallbonus multiplikativ auf Gesamtverteidigung pro Wall-Level.
export const WALL_DEFENSE_MULTIPLIER: readonly number[] = [
  1.00,
  1.04, 1.08, 1.13, 1.18, 1.23, 1.28, 1.33, 1.39, 1.45, 1.51,
  1.57, 1.63, 1.70, 1.77, 1.84, 1.92, 2.00, 2.08, 2.16, 2.25,
];
