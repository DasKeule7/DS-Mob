import { useState } from "react";
import { GameProvider, useGame } from "../game/GameProvider.js";
import { VillageScreen } from "../screens/VillageScreen.js";
import { MapScreen } from "../screens/MapScreen.js";
import { ReportsScreen } from "../screens/ReportsScreen.js";
import { SettingsScreen } from "../screens/SettingsScreen.js";
import { NewGameScreen } from "../screens/NewGameScreen.js";

type Tab = "village" | "map" | "reports" | "settings";

export function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}

function Shell() {
  const { world, status } = useGame();
  const [tab, setTab] = useState<Tab>("village");

  if (status === "loading") return <div className="splash">Lade Welt…</div>;
  if (status === "error") return <div className="splash error">Fehler beim Laden der Welt.</div>;
  if (!world) return <NewGameScreen />;

  const firstVillageId = Object.keys(world.villages)[0]!;

  return (
    <main className="app">
      <div className="content">
        {tab === "village" && <VillageScreen villageId={firstVillageId} />}
        {tab === "map" && <MapScreen />}
        {tab === "reports" && <ReportsScreen />}
        {tab === "settings" && <SettingsScreen />}
      </div>
      <nav className="tabbar">
        <TabButton active={tab === "village"} onClick={() => setTab("village")} icon="🏘️" label="Dorf" />
        <TabButton active={tab === "map"} onClick={() => setTab("map")} icon="🗺️" label="Karte" />
        <TabButton active={tab === "reports"} onClick={() => setTab("reports")} icon="📜" label="Berichte" />
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon="⚙️" label="Optionen" />
      </nav>
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button type="button" className={"tab" + (active ? " active" : "")} onClick={onClick}>
      <span className="tabIcon">{icon}</span>
      <span className="tabLabel">{label}</span>
    </button>
  );
}
