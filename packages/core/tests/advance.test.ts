import { describe, it, expect } from "vitest";
import { advanceTo } from "../src/events/queue.js";
import { enqueueBuild } from "../src/sim/construction.js";
import { enqueueRecruit } from "../src/sim/recruitment.js";
import { makeVillage, makeWorld } from "./fixtures.js";

describe("advanceTo", () => {
  it("spult leere Welt = setzt nur nowMs + Rohstoff-Update", () => {
    const v = makeVillage({ lastUpdateMs: 0, resources: { wood: 0, stone: 0, iron: 0 } });
    const world = makeWorld([v]);
    const later = advanceTo(world, 3_600_000); // 1h
    expect(later.nowMs).toBe(3_600_000);
    expect(later.villages.v1!.resources.wood).toBeGreaterThan(0);
  });

  it("schließt Bau-Event ab, wenn finishMs < untilMs", () => {
    let v = makeVillage();
    const r = enqueueBuild(v, "wood", 0);
    if (!r.ok) throw new Error("enqueue failed");
    v = r.village;
    const world = makeWorld([v]);
    const finishMs = v.buildQueue[0]!.finishMs;
    const later = advanceTo(world, finishMs + 1000);
    expect(later.villages.v1!.buildings.wood).toBe(2);
    expect(later.villages.v1!.buildQueue).toHaveLength(0);
  });

  it("schließt Rekrutierungs-Ticks sequentiell ab", () => {
    let v = makeVillage({ buildings: { ...makeVillage().buildings, barracks: 1 } });
    const r = enqueueRecruit(v, "spear", 3, 0, { farmCap: 240 });
    if (!r.ok) throw new Error("enqueue recruit failed");
    v = r.village;
    const world = makeWorld([v]);
    // Nach (3 * perUnitMs) + 1 s müssen 3 Speere im Dorf sein.
    const perUnit = v.recruitQueues.barracks[0]!.perUnitMs;
    const later = advanceTo(world, perUnit * 3 + 1000);
    expect(later.villages.v1!.units.spear).toBe(3);
    expect(later.villages.v1!.recruitQueues.barracks).toHaveLength(0);
  });

  it("Rohstoff-Produktion und Bau-Event im selben Vorspul-Vorgang konsistent", () => {
    let v = makeVillage({ resources: { wood: 200, stone: 200, iron: 200 } });
    const r = enqueueBuild(v, "wood", 0); // zieht Kosten sofort ab
    if (!r.ok) throw new Error("enqueue");
    v = r.village;
    const world = makeWorld([v]);
    const finishMs = v.buildQueue[0]!.finishMs;
    const later = advanceTo(world, finishMs + 7_200_000); // 2h nach Bauende
    expect(later.villages.v1!.buildings.wood).toBe(2);
    // Neue Minenstufe sollte in den 2h höher produziert haben als Lvl 1.
    expect(later.villages.v1!.resources.wood).toBeGreaterThan(60);
  });
});
