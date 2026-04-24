import { describe, it, expect } from "vitest";
import { coinsNeededForNthNoble, totalCoinsNeeded, rollLoyaltyDrop, applyNobleAttack, mintCoin, COIN_COST } from "../src/sim/conquest.js";
import { makeRand, makeVillage } from "./fixtures.js";

describe("Münz-/Adelsproduktion", () => {
  it("n-ter AG benötigt n Münzen", () => {
    expect(coinsNeededForNthNoble(0)).toBe(1);
    expect(coinsNeededForNthNoble(1)).toBe(2);
    expect(coinsNeededForNthNoble(2)).toBe(3);
  });
  it("3 Adelsgeschlechter = 1+2+3 = 6 Münzen", () => {
    expect(totalCoinsNeeded(0, 3)).toBe(6);
  });
});

describe("rollLoyaltyDrop", () => {
  it("immer im Bereich 20..35", () => {
    const rand = makeRand(123);
    for (let i = 0; i < 200; i++) {
      const v = rollLoyaltyDrop(rand);
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(35);
    }
  });
});

describe("applyNobleAttack", () => {
  it("reduziert Zustimmung, übernimmt nicht bei Zustimmung > 0", () => {
    const rand = makeRand(1);
    const v = makeVillage({ loyalty: 100 });
    const r = applyNobleAttack(v, { rand, newOwnerId: "p2" });
    expect(r.newOwnerId).toBeNull();
    expect(r.village.loyalty).toBeLessThan(100);
    expect(r.village.ownerId).toBe("p1");
  });

  it("übernimmt Dorf bei Zustimmung ≤ 0, resettet auf 25", () => {
    const rand = makeRand(5);
    const v = makeVillage({ loyalty: 10 }); // nach 1 Angriff sicher ≤0
    const r = applyNobleAttack(v, { rand, newOwnerId: "p2" });
    expect(r.newOwnerId).toBe("p2");
    expect(r.village.ownerId).toBe("p2");
    expect(r.village.loyalty).toBe(25);
  });
});

describe("mintCoin", () => {
  it("zieht Münzkosten ab und erhöht mintedCoins", () => {
    const v = makeVillage({ resources: { wood: 100_000, stone: 100_000, iron: 100_000 } });
    const p = { id: "p1", name: "X", villageIds: ["v1"], points: 0, noblesProduced: 0, research: {} };
    const r = mintCoin(v, p);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.village.mintedCoins).toBe(1);
    expect(r.village.resources.wood).toBe(100_000 - COIN_COST.wood);
  });

  it("lehnt ab bei zu wenig Rohstoffen", () => {
    const v = makeVillage({ resources: { wood: 0, stone: 0, iron: 0 } });
    const p = { id: "p1", name: "X", villageIds: ["v1"], points: 0, noblesProduced: 0, research: {} };
    const r = mintCoin(v, p);
    expect("error" in r).toBe(true);
  });
});
