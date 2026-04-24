import {
  COIN_COST,
  coinsNeededForNthNoble,
  totalCoinsNeeded,
  UNITS,
  type Village,
  type Player,
} from "@ds-mob/core";

interface Props {
  village: Village;
  player: Player;
  onMint: () => void;
}

export function AcademyPanel({ village, player, onMint }: Props) {
  if (village.buildings.academy <= 0) return null;

  const currentNobles = village.units.nobleman;
  const nextNobleCost = coinsNeededForNthNoble(player.noblesProduced);
  const canMint =
    village.resources.wood >= COIN_COST.wood &&
    village.resources.stone >= COIN_COST.stone &&
    village.resources.iron >= COIN_COST.iron;

  return (
    <section className="academyPanel">
      <h3>Münze</h3>
      <p className="sheetNote">
        AG-Produktion benötigt <strong>{nextNobleCost}</strong> Münzen (gesamt für nächsten AG:
        {" "}{totalCoinsNeeded(player.noblesProduced, player.noblesProduced + 1)})
      </p>
      <p className="sheetNote">
        Vorhanden: <strong>{village.mintedCoins}</strong> Münzen · im Dorf: {currentNobles}×
        {" "}{UNITS.nobleman.cost.pop}P
      </p>
      <ul className="costList">
        <li>🌲 {COIN_COST.wood.toLocaleString("de-DE")}</li>
        <li>🧱 {COIN_COST.stone.toLocaleString("de-DE")}</li>
        <li>⛏️ {COIN_COST.iron.toLocaleString("de-DE")}</li>
      </ul>
      <button type="button" className="sheetButton primary" disabled={!canMint} onClick={onMint}>
        {canMint ? "Münze prägen" : "Nicht genug Rohstoffe"}
      </button>
    </section>
  );
}
