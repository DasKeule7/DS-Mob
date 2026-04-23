import { describe, it, expect } from "vitest";
import { sendAttack } from "../src/sim/flights.js";
import { travelTimeMs, distanceFields } from "../src/sim/movement.js";
import { advanceTo } from "../src/events/queue.js";
import { BARBARIAN_OWNER_ID } from "../src/state/index.js";
import { UNITS } from "../src/data/units.js";
import { makeVillage, makeWorld } from "./fixtures.js";

describe("movement", () => {
  it("Distanz ist euklidisch", () => {
    expect(distanceFields({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it("Reisezeit = langsamste Einheit * Distanz", () => {
    const t = travelTimeMs({ x: 0, y: 0 }, { x: 0, y: 10 }, { spear: 5 });
    // Speer = 18 min/Feld, 10 Felder → 180 min = 10_800_000 ms
    expect(t).toBeCloseTo(10_800_000, -2);
  });
  it("Mischtruppe nutzt den langsamsten Speed", () => {
    const t = travelTimeMs({ x: 0, y: 0 }, { x: 0, y: 1 }, { lightCav: 5, spear: 5 });
    expect(t).toBeCloseTo(UNITS.spear.speedMinPerField * 60_000, -1);
  });
});

describe("sendAttack + advanceTo → Kampf + Rückflug + Beute", () => {
  it("Speer-Armee besiegt schwach verteidigtes Barbarendorf, kehrt mit Beute zurück", () => {
    const attacker = makeVillage({
      id: "att",
      ownerId: "p_me",
      coord: { x: 100, y: 100 },
      units: { ...makeVillage().units, spear: 500 },
    });
    const barb = makeVillage({
      id: "barb",
      ownerId: BARBARIAN_OWNER_ID,
      coord: { x: 100, y: 102 },
      units: { ...makeVillage().units, spear: 10 },
      resources: { wood: 2000, stone: 2000, iron: 2000 },
    });
    const world = makeWorld([attacker, barb]);

    const send = sendAttack(world, {
      fromVillageId: "att",
      toVillageId: "barb",
      units: { spear: 200 },
      nowMs: 0,
    });
    expect(send.ok).toBe(true);
    if (!send.ok) return;

    const arriveMs = send.flight.arriveMs;
    // 2 Felder * 18 min = 36 min
    expect(arriveMs).toBeCloseTo(2 * 18 * 60_000, -2);

    // Nach Ankunft: Kampf sollte resolved sein, ein Report in der Liste, ein
    // Return-Flight unterwegs.
    const afterArrival = advanceTo(send.state, arriveMs + 1);
    expect(afterArrival.reports).toHaveLength(1);
    expect(afterArrival.reports[0]!.winner).toBe("attacker");
    expect(afterArrival.flights.some((f) => f.mode === "return")).toBe(true);
    // Barbar-Truppen dezimiert
    expect(afterArrival.villages.barb!.units.spear).toBe(0);

    // Rückflug weiterhin: vor Rückkunft bleiben attacker-Einheiten 0,
    // danach sind sie wieder im Dorf, Ressourcen erhöht.
    const returnFlight = afterArrival.flights.find((f) => f.mode === "return")!;
    const afterReturn = advanceTo(afterArrival, returnFlight.arriveMs + 1);
    expect(afterReturn.villages.att!.units.spear).toBeGreaterThan(0);
    const resOut = afterReturn.villages.att!.resources;
    expect(resOut.wood + resOut.stone + resOut.iron).toBeGreaterThan(0);
  });

  it("verliert alle Angreifer, wenn Verteidigung zu stark ist", () => {
    const attacker = makeVillage({
      id: "att",
      coord: { x: 100, y: 100 },
      units: { ...makeVillage().units, spear: 10 },
    });
    const barb = makeVillage({
      id: "barb",
      ownerId: BARBARIAN_OWNER_ID,
      coord: { x: 100, y: 102 },
      units: { ...makeVillage().units, spear: 2000 },
    });
    const world = makeWorld([attacker, barb]);
    const send = sendAttack(world, {
      fromVillageId: "att",
      toVillageId: "barb",
      units: { spear: 10 },
      nowMs: 0,
    });
    if (!send.ok) throw new Error("send failed");
    const after = advanceTo(send.state, send.flight.arriveMs + 1);
    expect(after.reports[0]!.winner).toBe("defender");
    // Kein Rückflug
    expect(after.flights.find((f) => f.mode === "return")).toBeUndefined();
  });

  it("lehnt ab, wenn nicht genug Truppen im Dorf", () => {
    const attacker = makeVillage({ id: "att", units: { ...makeVillage().units, spear: 5 } });
    const barb = makeVillage({ id: "barb", ownerId: BARBARIAN_OWNER_ID });
    const world = makeWorld([attacker, barb]);
    const send = sendAttack(world, { fromVillageId: "att", toVillageId: "barb", units: { spear: 100 }, nowMs: 0 });
    expect(send.ok).toBe(false);
  });

  it("lehnt ab bei gleichem from/to", () => {
    const v = makeVillage({ id: "v" });
    const world = makeWorld([v]);
    const send = sendAttack(world, { fromVillageId: "v", toVillageId: "v", units: { spear: 1 }, nowMs: 0 });
    expect(send.ok).toBe(false);
  });
});
