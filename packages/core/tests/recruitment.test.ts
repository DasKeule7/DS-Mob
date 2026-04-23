import { describe, it, expect } from "vitest";
import { recruitTimeSeconds, enqueueRecruit, applyRecruitTick } from "../src/sim/recruitment.js";
import { UNITS } from "../src/data/units.js";
import { makeVillage } from "./fixtures.js";

describe("recruitTimeSeconds", () => {
  it("auf Lvl 1 = Basiszeit", () => {
    expect(recruitTimeSeconds("spear", 1)).toBe(UNITS.spear.buildTimeSec);
  });
  it("skaliert mit Gebäude-Level (Lvl 25 deutlich schneller als Lvl 1)", () => {
    const t1 = recruitTimeSeconds("spear", 1);
    const t25 = recruitTimeSeconds("spear", 25);
    expect(t25).toBeLessThan(t1 / 3);
  });
  it("Lvl 0 = Infinity (kein Gebäude)", () => {
    expect(recruitTimeSeconds("spear", 0)).toBe(Infinity);
  });
});

describe("enqueueRecruit", () => {
  it("verweigert ohne Kaserne", () => {
    const v = makeVillage();
    const r = enqueueRecruit(v, "spear", 5, 0, { farmCap: 240 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("missingBuilding");
  });

  it("reiht Speer ein und zieht Rohstoffe + Bevölkerung ab", () => {
    const v = makeVillage({ buildings: { ...makeVillage().buildings, barracks: 1 } });
    const r = enqueueRecruit(v, "spear", 10, 0, { farmCap: 240 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.village.recruitQueues.barracks).toHaveLength(1);
    expect(r.village.recruitQueues.barracks[0]!.remainingCount).toBe(10);
    expect(r.village.resources.wood).toBe(10_000 - UNITS.spear.cost.wood * 10);
  });

  it("verweigert bei Bauernhof-Überlauf", () => {
    const v = makeVillage({
      buildings: { ...makeVillage().buildings, barracks: 1 },
      resources: { wood: 10_000_000, stone: 10_000_000, iron: 10_000_000 },
    });
    const r = enqueueRecruit(v, "spear", 1000, 0, { farmCap: 240 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("insufficientPop");
  });
});

describe("applyRecruitTick", () => {
  it("fügt +1 Einheit hinzu und dekrementiert den Auftrag", () => {
    let v = makeVillage({ buildings: { ...makeVillage().buildings, barracks: 1 } });
    v = (enqueueRecruit(v, "spear", 3, 0, { farmCap: 240 }) as { ok: true; village: typeof v }).village;
    const order = v.recruitQueues.barracks[0]!;
    v = applyRecruitTick(v, "barracks", order);
    expect(v.units.spear).toBe(1);
    expect(v.recruitQueues.barracks[0]!.remainingCount).toBe(2);
  });
  it("entfernt leere Orders", () => {
    let v = makeVillage({ buildings: { ...makeVillage().buildings, barracks: 1 } });
    v = (enqueueRecruit(v, "spear", 1, 0, { farmCap: 240 }) as { ok: true; village: typeof v }).village;
    const order = v.recruitQueues.barracks[0]!;
    v = applyRecruitTick(v, "barracks", order);
    expect(v.recruitQueues.barracks).toHaveLength(0);
    expect(v.units.spear).toBe(1);
  });
});
