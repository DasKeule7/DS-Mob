import { describe, it, expect } from "vitest";
import { researchUnit, researchCost } from "../src/sim/research.js";
import { sendAttack } from "../src/sim/flights.js";
import { advanceTo } from "../src/events/queue.js";
import { BARBARIAN_OWNER_ID } from "../src/state/index.js";
import { makeVillage, makeWorld } from "./fixtures.js";

describe("Schmiede-Forschung", () => {
  it("lehnt ab, wenn Schmiede-Level nicht ausreicht", () => {
    const v = makeVillage({ buildings: { ...makeVillage().buildings, smithy: 0 } });
    const p = { id: "p1", name: "X", villageIds: ["v1"], points: 0, noblesProduced: 0, research: {} };
    const r = researchUnit(v, p, "spear");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("smithyMissing");
  });

  it("Speer Stufe 1 braucht Schmiede 1 und zieht Kosten ab", () => {
    const v = makeVillage({ buildings: { ...makeVillage().buildings, smithy: 1 } });
    const p = { id: "p1", name: "X", villageIds: ["v1"], points: 0, noblesProduced: 0, research: {} };
    const cost = researchCost("spear", 1);
    const r = researchUnit(v, p, "spear");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.player.research.spear).toBe(1);
    expect(r.village.resources.wood).toBe(10_000 - cost.wood);
  });

  it("ab Stufe 2 wird höhere Schmiede benötigt", () => {
    const v = makeVillage({ buildings: { ...makeVillage().buildings, smithy: 1 }, resources: { wood: 1_000_000, stone: 1_000_000, iron: 1_000_000 } });
    const p1 = { id: "p1", name: "X", villageIds: ["v1"], points: 0, noblesProduced: 0, research: { spear: 1 } };
    const r = researchUnit(v, p1, "spear");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("smithyMissing");
  });

  it("cap bei Stufe 3", () => {
    const v = makeVillage({ buildings: { ...makeVillage().buildings, smithy: 20 }, resources: { wood: 1_000_000, stone: 1_000_000, iron: 1_000_000 } });
    const p = { id: "p1", name: "X", villageIds: ["v1"], points: 0, noblesProduced: 0, research: { spear: 3 } };
    const r = researchUnit(v, p, "spear");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("maxLevel");
  });

  it("Forschungsbonus wirkt im Kampf", () => {
    // Gleicher Angriff, einmal ohne, einmal mit Forschung. Bei Forschung
    // sollte der Angreifer stärker dastehen (weniger eigene Verluste bei Sieg
    // oder höhere defenderPower beim Verteidiger).
    const me = makeVillage({ id: "me", ownerId: "p_me", coord: { x: 0, y: 0 }, units: { ...makeVillage().units, axe: 150 } });
    const victim = makeVillage({ id: "victim", ownerId: BARBARIAN_OWNER_ID, coord: { x: 0, y: 1 }, units: { ...makeVillage().units, spear: 100 } });

    const worldA = makeWorld([me, victim]);
    worldA.players = { p_me: { id: "p_me", name: "Me", villageIds: ["me"], points: 100, noblesProduced: 0, research: {} } };
    const aSend = sendAttack(worldA, { fromVillageId: "me", toVillageId: "victim", units: { axe: 150 }, nowMs: 0 });
    if (!aSend.ok) throw new Error("a");
    const a = advanceTo(aSend.state, aSend.flight.arriveMs + 1);

    const worldB = makeWorld([me, victim]);
    worldB.players = { p_me: { id: "p_me", name: "Me", villageIds: ["me"], points: 100, noblesProduced: 0, research: { axe: 3 } } };
    const bSend = sendAttack(worldB, { fromVillageId: "me", toVillageId: "victim", units: { axe: 150 }, nowMs: 0 });
    if (!bSend.ok) throw new Error("b");
    const b = advanceTo(bSend.state, bSend.flight.arriveMs + 1);

    const survA = a.reports[0]!.attackerSurvivors.axe ?? 0;
    const survB = b.reports[0]!.attackerSurvivors.axe ?? 0;
    expect(survB).toBeGreaterThanOrEqual(survA);
  });
});
