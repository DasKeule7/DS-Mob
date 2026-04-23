import { describe, it, expect } from "vitest";
import { simulateCombat, wallDefenseMultiplier, effectiveWallLevel, computeMorale, rollLuck } from "../src/sim/combat.js";
import { makeRand } from "./fixtures.js";

describe("wallDefenseMultiplier", () => {
  it("Level 0 = 1.0", () => expect(wallDefenseMultiplier(0)).toBe(1.0));
  it("Level 20 = 2.25", () => expect(wallDefenseMultiplier(20)).toBe(2.25));
  it("wächst monoton", () => {
    for (let l = 1; l < 20; l++) {
      expect(wallDefenseMultiplier(l + 1)).toBeGreaterThan(wallDefenseMultiplier(l));
    }
  });
});

describe("effectiveWallLevel", () => {
  it("keine Rammböcke = unverändert", () => {
    expect(effectiveWallLevel(10, 0)).toBe(10);
  });
  it("30 Rammböcke = -1 Level", () => {
    expect(effectiveWallLevel(10, 30)).toBe(9);
  });
  it("Rammböcke können Wall nicht unter halbes Level drücken", () => {
    expect(effectiveWallLevel(10, 10_000)).toBe(5);
  });
});

describe("simulateCombat", () => {
  it("100 Speere vs leeres Dorf → Angreifer gewinnt ohne Verluste", () => {
    const r = simulateCombat(
      { spear: 100 },
      {},
      { wallLevel: 0, nightBonus: false, moraleAttacker: 1, luckPercent: 0 },
    );
    expect(r.winner).toBe("attacker");
    expect(r.attackerSurvivors.spear).toBe(100);
  });

  it("Wall reduziert Verluste des Verteidigers", () => {
    const base = simulateCombat(
      { axe: 500 },
      { spear: 200 },
      { wallLevel: 0, nightBonus: false, moraleAttacker: 1, luckPercent: 0 },
    );
    const withWall = simulateCombat(
      { axe: 500 },
      { spear: 200 },
      { wallLevel: 20, nightBonus: false, moraleAttacker: 1, luckPercent: 0 },
    );
    expect(withWall.defenderPower).toBeGreaterThan(base.defenderPower);
  });

  it("Nachtbonus verdoppelt Defensive zwischen 00–08", () => {
    const day = simulateCombat(
      { axe: 100 },
      { spear: 100 },
      { wallLevel: 0, nightBonus: true, attackHour: 12, moraleAttacker: 1, luckPercent: 0 },
    );
    const night = simulateCombat(
      { axe: 100 },
      { spear: 100 },
      { wallLevel: 0, nightBonus: true, attackHour: 3, moraleAttacker: 1, luckPercent: 0 },
    );
    expect(night.defenderPower).toBeCloseTo(day.defenderPower * 2, 5);
  });

  it("Glück +25 % erhöht Angriff, -25 % senkt ihn", () => {
    const pos = simulateCombat(
      { axe: 100 },
      { spear: 100 },
      { wallLevel: 0, nightBonus: false, moraleAttacker: 1, luckPercent: 25 },
    );
    const neg = simulateCombat(
      { axe: 100 },
      { spear: 100 },
      { wallLevel: 0, nightBonus: false, moraleAttacker: 1, luckPercent: -25 },
    );
    expect(pos.attackerPower).toBeGreaterThan(neg.attackerPower * 1.6);
  });

  it("Kavallerie-Angreifer zieht Cav-Verteidigung des Defenders", () => {
    // Speer hat cav-def 45, general-def 15 → rein Kavallerie-Angriff trifft hart auf Speere.
    const vsSpear = simulateCombat(
      { lightCav: 100 },
      { spear: 500 },
      { wallLevel: 0, nightBonus: false, moraleAttacker: 1, luckPercent: 0 },
    );
    // Gegen Schwerter (cav-def 15) soll Kavallerie deutlich besser abschneiden.
    const vsSword = simulateCombat(
      { lightCav: 100 },
      { sword: 500 },
      { wallLevel: 0, nightBonus: false, moraleAttacker: 1, luckPercent: 0 },
    );
    expect(vsSword.defenderPower).toBeLessThan(vsSpear.defenderPower);
  });
});

describe("computeMorale", () => {
  it("gleiche Punkte → 1.0", () => {
    expect(computeMorale(1000, 1000)).toBeCloseTo(1, 5);
  });
  it("Angreifer 10x größer → deutlich weniger als 1", () => {
    expect(computeMorale(10_000, 1_000)).toBeLessThan(1);
  });
  it("clampt auf min 0.3", () => {
    expect(computeMorale(1_000_000, 1)).toBeGreaterThanOrEqual(0.3);
  });
});

describe("rollLuck", () => {
  it("bleibt im Bereich -25..+25", () => {
    const rand = makeRand(42);
    for (let i = 0; i < 100; i++) {
      const l = rollLuck(rand);
      expect(l).toBeGreaterThanOrEqual(-25);
      expect(l).toBeLessThanOrEqual(25);
    }
  });
});
