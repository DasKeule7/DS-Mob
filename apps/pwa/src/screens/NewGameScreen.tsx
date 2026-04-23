import { useState } from "react";
import { useGame } from "../game/GameProvider.js";

export function NewGameScreen() {
  const { newGame } = useGame();
  const [playerName, setPlayerName] = useState("Häuptling");
  const [villageName, setVillageName] = useState("Erstes Dorf");
  return (
    <div className="screen newGame">
      <h1>DS-Mob</h1>
      <p className="subtle">Starte dein erstes Dorf.</p>
      <label>
        Spielername
        <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} />
      </label>
      <label>
        Dorfname
        <input value={villageName} onChange={(e) => setVillageName(e.target.value)} maxLength={30} />
      </label>
      <button
        type="button"
        className="sheetButton primary"
        disabled={!playerName.trim() || !villageName.trim()}
        onClick={() => newGame({ playerName: playerName.trim(), villageName: villageName.trim() })}
      >
        Welt erstellen
      </button>
    </div>
  );
}
