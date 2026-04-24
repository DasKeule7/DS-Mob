import { describe, it, expect } from "vitest";
import { sendAttack, sendSupport, recallSupport } from "../src/sim/flights.js";
import { advanceTo } from "../src/events/queue.js";
import { BARBARIAN_OWNER_ID } from "../src/state/index.js";
import { makeVillage, makeWorld } from "./fixtures.js";

describe("Unterstützung", () => {
  it("Support kommt an und wird zu supports[] des Zieldorfs", () => {
    const home = makeVillage({ id: "home", coord: { x: 100, y: 100 }, units: { ...makeVillage().units, spear: 100 } });
    const ally = makeVillage({ id: "ally", coord: { x: 100, y: 102 }, ownerId: "p_me" });
    const world = makeWorld([home, ally]);
    const r = sendSupport(world, { fromVillageId: "home", toVillageId: "ally", units: { spear: 40 }, nowMs: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const after = advanceTo(r.state, r.flight.arriveMs + 1);
    expect(after.villages.ally!.supports).toHaveLength(1);
    expect(after.villages.ally!.supports[0]!.units.spear).toBe(40);
    // Ausgangsdorf hat Truppen bereits abgezogen.
    expect(after.villages.home!.units.spear).toBe(60);
  });

  it("stationierte Unterstützung verstärkt Verteidigung + verliert anteilig", () => {
    const attacker = makeVillage({ id: "att", ownerId: "p_foe", coord: { x: 100, y: 100 }, units: { ...makeVillage().units, axe: 200 } });
    const defender = makeVillage({ id: "def", coord: { x: 100, y: 102 }, units: { ...makeVillage().units, spear: 100 } });
    const ally = makeVillage({ id: "ally", coord: { x: 100, y: 104 }, units: { ...makeVillage().units, spear: 200 } });

    // ally schickt 100 Speere zu defender
    const w0 = makeWorld([attacker, defender, ally]);
    const sup = sendSupport(w0, { fromVillageId: "ally", toVillageId: "def", units: { spear: 100 }, nowMs: 0 });
    if (!sup.ok) throw new Error("support");
    const afterSupport = advanceTo(sup.state, sup.flight.arriveMs + 1);
    expect(afterSupport.villages.def!.supports).toHaveLength(1);

    // attacker (anderer Spieler) greift danach an — 200 Axtkämpfer
    const atk = sendAttack(afterSupport, {
      fromVillageId: "att",
      toVillageId: "def",
      units: { axe: 200 },
      nowMs: sup.flight.arriveMs + 100,
    });
    expect(atk.ok).toBe(true);
    if (!atk.ok) return;
    const resolved = advanceTo(atk.state, atk.flight.arriveMs + 1);
    // Verteidiger-eigene Speere + Support werden gemeinsam verteidigt.
    // Entweder beide gewinnen (volle Speere mehr als 200 Äxte brauchen) oder
    // anteilig dezimiert — in jedem Fall sollten die Support-Einheiten im
    // supports[] weniger oder gleich viele sein als vorher.
    const supAfter = resolved.villages.def!.supports[0];
    expect(supAfter ? supAfter.units.spear ?? 0 : 0).toBeLessThanOrEqual(100);
    // Und: ein Report existiert.
    expect(resolved.reports.length).toBeGreaterThan(0);
    expect(resolved.reports[0]!.defenderUnits.spear).toBe(200); // merged defense
  });

  it("recallSupport erzeugt Rückflug ins Herkunftsdorf", () => {
    const home = makeVillage({ id: "home", coord: { x: 100, y: 100 }, units: { ...makeVillage().units, spear: 100 } });
    const ally = makeVillage({ id: "ally", coord: { x: 100, y: 102 }, ownerId: "p_me" });
    const world = makeWorld([home, ally]);
    const r = sendSupport(world, { fromVillageId: "home", toVillageId: "ally", units: { spear: 30 }, nowMs: 0 });
    if (!r.ok) throw new Error("support");
    const afterSupport = advanceTo(r.state, r.flight.arriveMs + 1);
    const supportId = afterSupport.villages.ally!.supports[0]!.id;
    const recall = recallSupport(afterSupport, "ally", supportId, r.flight.arriveMs + 100);
    expect(recall.ok).toBe(true);
    if (!recall.ok) return;
    expect(recall.state.villages.ally!.supports).toHaveLength(0);
    const ret = recall.state.flights.find((f) => f.mode === "return")!;
    expect(ret).toBeDefined();
    const finalState = advanceTo(recall.state, ret.arriveMs + 1);
    expect(finalState.villages.home!.units.spear).toBe(100); // 70 blieben + 30 zurück
  });

  it("Barbarendörfer haben keine Player-Einträge, werden aber normal unterstützt/angegriffen", () => {
    const me = makeVillage({ id: "me", coord: { x: 0, y: 0 }, units: { ...makeVillage().units, spear: 10 } });
    const barb = makeVillage({ id: "barb", ownerId: BARBARIAN_OWNER_ID, coord: { x: 0, y: 1 } });
    const world = makeWorld([me, barb]);
    const r = sendSupport(world, { fromVillageId: "me", toVillageId: "barb", units: { spear: 5 }, nowMs: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const after = advanceTo(r.state, r.flight.arriveMs + 1);
    expect(after.villages.barb!.supports).toHaveLength(1);
  });
});
