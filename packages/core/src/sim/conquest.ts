import type { Village, Player } from "../state/index.js";

// Kosten pro Münze (konstant, Welt-1-Standard).
export const COIN_COST = { wood: 28_000, stone: 30_000, iron: 25_000 } as const;

// Wie viele Münzen (bzw. Pakete im "ansteigenden" Paketsystem) benötigt ein
// Spieler für den n-ten Adelsgeschlecht, den er produziert? 1, 2, 3, ...
export function coinsNeededForNthNoble(existingNobles: number): number {
  return existingNobles + 1;
}

// Gesamtkosten (Münzen) um vom aktuellen Stand `producedSoFar` auf `target`
// Adelsgeschlechter zu kommen.
export function totalCoinsNeeded(producedSoFar: number, target: number): number {
  let sum = 0;
  for (let i = producedSoFar; i < target; i++) sum += coinsNeededForNthNoble(i);
  return sum;
}

// Zustimmungs-Reduktion durch einen erfolgreichen AG-Angriff.
// Wiki: zufällig 20..35. Erwartungswert 27.5. Wir stellen einen seedbaren PRNG
// bereit, damit Tests deterministisch bleiben.
export function rollLoyaltyDrop(rand: () => number = Math.random): number {
  return Math.floor(20 + rand() * 16); // 20..35 inklusive
}

export interface NobleAttackOptions {
  rand?: () => number;
  newOwnerId: string;
}

export interface NobleAttackResult {
  village: Village;
  newOwnerId: string | null; // null = Dorf noch nicht übernommen
  loyaltyDrop: number;
  loyaltyAfter: number;
}

// Wird aufgerufen nachdem der Kampf bereits gewonnen wurde und mindestens ein
// AG überlebt hat.
export function applyNobleAttack(village: Village, opts: NobleAttackOptions): NobleAttackResult {
  const drop = rollLoyaltyDrop(opts.rand);
  const after = village.loyalty - drop;
  if (after > 0) {
    return { village: { ...village, loyalty: after }, newOwnerId: null, loyaltyDrop: drop, loyaltyAfter: after };
  }
  // Übernahme — Loyalty reset auf 25 (Original), Dörfchen wechselt Besitzer.
  return {
    village: { ...village, loyalty: 25, ownerId: opts.newOwnerId },
    newOwnerId: opts.newOwnerId,
    loyaltyDrop: drop,
    loyaltyAfter: 25,
  };
}

// Kleiner Helfer: erfolgreicher Mint einer Münze im Dorf (Akademie/Münzstätte).
export function mintCoin(village: Village, player: Player): { village: Village; player: Player } | { error: string } {
  if (
    village.resources.wood < COIN_COST.wood ||
    village.resources.stone < COIN_COST.stone ||
    village.resources.iron < COIN_COST.iron
  ) {
    return { error: "Nicht genug Rohstoffe zum Münzen." };
  }
  return {
    village: {
      ...village,
      mintedCoins: village.mintedCoins + 1,
      resources: {
        wood: village.resources.wood - COIN_COST.wood,
        stone: village.resources.stone - COIN_COST.stone,
        iron: village.resources.iron - COIN_COST.iron,
      },
    },
    player,
  };
}
