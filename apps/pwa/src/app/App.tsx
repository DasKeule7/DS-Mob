import { useEffect, useState } from "react";
import { GameProvider, useGame } from "../game/GameProvider.js";
import { VillageScreen } from "../screens/VillageScreen.js";
import { MapScreen } from "../screens/MapScreen.js";
import { ReportsScreen } from "../screens/ReportsScreen.js";
import { SettingsScreen } from "../screens/SettingsScreen.js";
import { NewGameScreen } from "../screens/NewGameScreen.js";
import { VillageSwitcher } from "../components/VillageSwitcher.js";

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
  const [activeVillageId, setActiveVillageId] = useState<string | null>(null);

  // Wenn aktuelles Dorf im Welt-State nicht mehr dem Spieler gehört (Übernahme),
  // automatisch auf das erste eigene Dorf wechseln.
  useEffect(() => {
    if (!world) return;
    const me = Object.values(world.players)[0];
    if (!me) return;
    if (activeVillageId && me.villageIds.includes(activeVillageId)) return;
    setActiveVillageId(me.villageIds[0] ?? null);
  }, [world, activeVillageId]);

  if (status === "loading") return <div className="splash">Lade Welt…</div>;
  if (status === "error") return <div className="splash error">Fehler beim Laden der Welt.</div>;
  if (!world) return <NewGameScreen />;
  const me = Object.values(world.players)[0];
  if (!me) return <NewGameScreen />;
  const current = activeVillageId ?? me.villageIds[0];
  if (!current) return <p className="placeholder">Keine Dörfer mehr.</p>;

  const myVillages = me.villageIds.map((id) => world.villages[id]).filter((v): v is NonNullable<typeof v> => !!v);

  return (
    <main className="app">
      <div className="content">
        <VillageSwitcher villages={myVillages} activeId={current} onSelect={setActiveVillageId} />
        {tab === "village" && <VillageScreen villageId={current} />}
        {tab === "map" && <MapScreen myVillageId={current} myOwnerId={me.id} />}
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
