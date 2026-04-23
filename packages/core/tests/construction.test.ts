import { describe, it, expect } from "vitest";
import { buildCost, buildTimeSeconds, enqueueBuild, cancelBuild, applyBuildFinish, targetLevelInQueue, buildingPoints } from "../src/sim/construction.js";
import { makeVillage } from "./fixtures.js";

describe("buildCost", () => {
  it("Level 1 Hauptgebäude = Basiskosten", () => {
    expect(buildCost("main", 1)).toEqual({ wood: 90, stone: 80, iron: 70, pop: 5 });
  });
  it("skaliert exponentiell mit costFactor", () => {
    const c1 = buildCost("main", 1);
    const c2 = buildCost("main", 2);
    expect(c2.wood).toBe(Math.round(c1.wood * 1.26));
  });
});

describe("buildTimeSeconds", () => {
  it("HQ reduziert Bauzeit multiplikativ um 5 % pro Level", () => {
    const t0 = buildTimeSeconds("barracks", 1, 1);
    const t20 = buildTimeSeconds("barracks", 1, 20);
    expect(t20).toBeLessThan(t0);
    // 0.95^20 ≈ 0.358
    expect(t20 / t0).toBeCloseTo(Math.pow(0.95, 19), 5);
  });
  it("höhere Level sind langsamer (faktor 1.2)", () => {
    const t1 = buildTimeSeconds("main", 1, 1);
    const t2 = buildTimeSeconds("main", 2, 1);
    expect(t2 / t1).toBeCloseTo(1.2, 3);
  });
  it("World-Speed halbiert Zeit bei speed=2", () => {
    const normal = buildTimeSeconds("main", 1, 1, 1);
    const fast = buildTimeSeconds("main", 1, 1, 2);
    expect(fast).toBeCloseTo(normal / 2, 3);
  });
});

describe("enqueueBuild", () => {
  it("Bauauftrag wird eingereiht + Ressourcen werden abgezogen", () => {
    const v = makeVillage();
    const r = enqueueBuild(v, "wood", 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.village.buildQueue).toHaveLength(1);
    expect(r.village.buildQueue[0]!.building).toBe("wood");
    expect(r.village.buildQueue[0]!.toLevel).toBe(2);
    expect(r.village.resources.wood).toBeLessThan(10_000);
  });

  it("verweigert bei zu wenig Rohstoffen", () => {
    const v = makeVillage({ resources: { wood: 0, stone: 0, iron: 0 } });
    const r = enqueueBuild(v, "main", 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("insufficientResources");
  });

  it("verweigert bei Max-Level erreicht", () => {
    const v = makeVillage({
      buildings: { ...makeVillage().buildings, main: 30 },
    });
    const r = enqueueBuild(v, "main", 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("maxLevel");
  });

  it("maxQueueSize begrenzt Warteschlange", () => {
    let v = makeVillage();
    const r1 = enqueueBuild(v, "wood", 0, { maxQueueSize: 1 });
    if (!r1.ok) throw new Error("r1");
    v = r1.village;
    const r2 = enqueueBuild(v, "stone", 0, { maxQueueSize: 1 });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.error.kind).toBe("queueFull");
  });

  it("reiht das nächste Level basierend auf bereits anstehenden Aufträgen ein", () => {
    let v = makeVillage();
    v = (enqueueBuild(v, "wood", 0) as { ok: true; village: typeof v }).village;
    expect(targetLevelInQueue(v, "wood")).toBe(2);
    v = (enqueueBuild(v, "wood", 0) as { ok: true; village: typeof v }).village;
    expect(targetLevelInQueue(v, "wood")).toBe(3);
  });
});

describe("cancelBuild", () => {
  it("erstattet vollständig und entfernt den Auftrag", () => {
    let v = makeVillage();
    const before = { ...v.resources };
    v = (enqueueBuild(v, "wood", 0) as { ok: true; village: typeof v }).village;
    expect(v.buildQueue).toHaveLength(1);
    v = cancelBuild(v, 0);
    expect(v.buildQueue).toHaveLength(0);
    expect(v.resources).toEqual(before);
  });
});

describe("applyBuildFinish", () => {
  it("setzt neues Gebäude-Level und entfernt den Auftrag", () => {
    let v = makeVillage();
    v = (enqueueBuild(v, "barracks", 0) as { ok: true; village: typeof v }).village;
    const order = v.buildQueue[0]!;
    v = applyBuildFinish(v, order);
    expect(v.buildings.barracks).toBe(1);
    expect(v.buildQueue).toHaveLength(0);
  });
});

describe("buildingPoints", () => {
  it("wächst monoton mit Level", () => {
    expect(buildingPoints("main", 1)).toBeGreaterThan(0);
    expect(buildingPoints("main", 5)).toBeGreaterThan(buildingPoints("main", 4));
  });
});
