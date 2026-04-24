import { describe, it, expect } from "vitest";
import { sendAttack } from "../src/sim/flights.js";
import { advanceTo } from "../src/events/queue.js";
import { BARBARIAN_OWNER_ID, type WorldState } from "../src/state/index.js";
import { makeVillage, makeWorld } from "./fixtures.js";

function worldWithPlayer(target = BARBARIAN_OWNER_ID): WorldState {
  const me = makeVillage({ id: "me", ownerId: "p_me", coord: { x: 0, y: 0 }, units: { ...makeVillage().units, spear: 500, nobleman: 1 } });
  const victim = makeVillage({ id: "victim", ownerId: target, coord: { x: 0, y: 1 }, units: { ...makeVillage().units, spear: 5 }, loyalty: 20 });
  const world = makeWorld([me, victim]);
  world.players = {
    p_me: { id: "p_me", name: "Me", villageIds: ["me"], points: 100, noblesProduced: 0, research: {} },
    ...(target !== BARBARIAN_OWNER_ID ? { p_foe: { id: "p_foe", name: "Foe", villageIds: ["victim"], points: 100, noblesProduced: 0, research: {} } } : {}),
  };
  return world;
}

describe("Adlung / Dorfübernahme", () => {
  it("erfolgreicher AG-Angriff senkt Zustimmung und kann Dorf übernehmen", () => {
    const world = worldWithPlayer();
    const r = sendAttack(world, { fromVillageId: "me", toVillageId: "victim", units: { spear: 100, nobleman: 1 }, nowMs: 0 });
    if (!r.ok) throw new Error("send");
    const after = advanceTo(r.state, r.flight.arriveMs + 1);
    const report = after.reports[0]!;
    // Zustimmungs-Drop zwischen 20 und 35 (startet bei 20 → min 0 max -15).
    expect(report.loyaltyDrop).toBeGreaterThanOrEqual(20);
    expect(report.loyaltyDrop).toBeLessThanOrEqual(35);
    // Angreifer ist Sieger
    expect(report.winner).toBe("attacker");
    // Zustimmung = 20 - drop ≤ 0 → Übernahme
    expect(report.takeover).toBe(true);
    expect(after.villages.victim!.ownerId).toBe("p_me");
    // Player-Roster aktualisiert
    expect(after.players.p_me!.villageIds).toContain("victim");
    // Übernommener AG ist im Rückflug NICHT enthalten
    const returnFlight = after.flights.find((f) => f.mode === "return");
    if (returnFlight) {
      expect(returnFlight.units.nobleman ?? 0).toBe(0);
    }
  });

  it("ohne AG wird kein Zustimmungs-Drop und keine Übernahme ausgelöst", () => {
    const world = worldWithPlayer();
    const r = sendAttack(world, { fromVillageId: "me", toVillageId: "victim", units: { spear: 100 }, nowMs: 0 });
    if (!r.ok) throw new Error("send");
    const after = advanceTo(r.state, r.flight.arriveMs + 1);
    const report = after.reports[0]!;
    expect(report.loyaltyDrop).toBeUndefined();
    expect(report.takeover).toBeFalsy();
    expect(after.villages.victim!.ownerId).toBe(BARBARIAN_OWNER_ID);
  });

  it("wenn Angreifer verliert, wird kein AG-Effekt ausgelöst", () => {
    const me = makeVillage({ id: "me", ownerId: "p_me", coord: { x: 0, y: 0 }, units: { ...makeVillage().units, spear: 1, nobleman: 1 } });
    const victim = makeVillage({ id: "victim", ownerId: BARBARIAN_OWNER_ID, coord: { x: 0, y: 1 }, units: { ...makeVillage().units, spear: 5000 }, loyalty: 100 });
    const world = makeWorld([me, victim]);
    const r = sendAttack(world, { fromVillageId: "me", toVillageId: "victim", units: { spear: 1, nobleman: 1 }, nowMs: 0 });
    if (!r.ok) throw new Error("send");
    const after = advanceTo(r.state, r.flight.arriveMs + 1);
    expect(after.reports[0]!.winner).toBe("defender");
    expect(after.reports[0]!.takeover).toBeFalsy();
    expect(after.villages.victim!.loyalty).toBe(100);
  });

  it("Übernahme überträgt Dorf zwischen Spieler-Rostern", () => {
    const world = worldWithPlayer("p_foe");
    const r = sendAttack(world, { fromVillageId: "me", toVillageId: "victim", units: { spear: 200, nobleman: 1 }, nowMs: 0 });
    if (!r.ok) throw new Error("send");
    const after = advanceTo(r.state, r.flight.arriveMs + 1);
    if (after.reports[0]!.takeover) {
      expect(after.players.p_me!.villageIds).toContain("victim");
      expect(after.players.p_foe!.villageIds).not.toContain("victim");
    }
  });
});
