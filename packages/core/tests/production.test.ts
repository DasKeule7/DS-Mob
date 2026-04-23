import { describe, it, expect } from "vitest";
import { productionPerHour, storageCapacity, resourcesAt } from "../src/sim/production.js";
import type { Village } from "../src/state/index.js";

describe("productionPerHour (Wiki-Referenzen, Welt-Speed 1)", () => {
  it("Level 0 = 5 (Grundproduktion)", () => {
    expect(productionPerHour(0)).toBe(5);
  });
  it("Level 1 = 30", () => {
    expect(productionPerHour(1)).toBe(30);
  });
  it("Level 10 = 117", () => {
    expect(productionPerHour(10)).toBe(117);
  });
  it("Level 20 = 530", () => {
    expect(productionPerHour(20)).toBe(530);
  });
  it("Level 30 = 2400", () => {
    expect(productionPerHour(30)).toBe(2400);
  });
});

describe("storageCapacity", () => {
  it("Level 1 = 1000", () => {
    expect(storageCapacity(1)).toBe(1000);
  });
  it("Level 30 = 400000", () => {
    expect(storageCapacity(30)).toBe(400000);
  });
});

describe("resourcesAt (lazy)", () => {
  const baseVillage: Village = {
    id: "v1",
    ownerId: "p1",
    coord: { x: 500, y: 500 },
    name: "Startdorf",
    buildings: {
      main: 1, barracks: 0, stable: 0, garage: 0, academy: 0, smithy: 0, rally: 1,
      statue: 0, market: 0, wood: 1, stone: 1, iron: 1, farm: 1, storage: 1, hide: 0,
      wall: 0, church: 0, watchtower: 0,
    },
    units: {
      spear: 0, sword: 0, axe: 0, archer: 0, scout: 0, lightCav: 0, mountedArcher: 0,
      heavyCav: 0, ram: 0, catapult: 0, paladin: 0, nobleman: 0, militia: 0,
    },
    resources: { wood: 0, stone: 0, iron: 0 },
    lastUpdateMs: 0,
    loyalty: 100,
  };

  it("1 Stunde auf Level-1-Minen = 30 jede Ressource", () => {
    const r = resourcesAt(baseVillage, 3_600_000);
    expect(r.wood).toBe(30);
    expect(r.stone).toBe(30);
    expect(r.iron).toBe(30);
  });

  it("wird durch Speicher-Kapazität gekappt", () => {
    const r = resourcesAt(baseVillage, 3_600_000 * 1000);
    expect(r.wood).toBe(1000);
    expect(r.stone).toBe(1000);
    expect(r.iron).toBe(1000);
  });

  it("berücksichtigt World-Speed-Multiplikator", () => {
    const r = resourcesAt(baseVillage, 3_600_000, 2);
    expect(r.wood).toBe(60);
  });
});
