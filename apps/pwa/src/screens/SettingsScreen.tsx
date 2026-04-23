import { useGame } from "../game/GameProvider.js";

export function SettingsScreen() {
  const { world, resetAll } = useGame();
  if (!world) return null;
  return (
    <div className="screen">
      <h1>Einstellungen</h1>
      <dl className="metaList">
        <dt>Welt-Geschwindigkeit</dt><dd>×{world.config.speed}</dd>
        <dt>Nachtbonus</dt><dd>{world.config.nightBonus ? "aktiv" : "aus"}</dd>
        <dt>Kartengröße</dt><dd>{world.config.mapSize}</dd>
      </dl>
      <button
        type="button"
        className="sheetButton danger"
        onClick={() => {
          if (window.confirm("Ganze Welt löschen und neu starten? Dies kann nicht rückgängig gemacht werden.")) {
            resetAll();
          }
        }}
      >
        Welt zurücksetzen
      </button>
    </div>
  );
}
