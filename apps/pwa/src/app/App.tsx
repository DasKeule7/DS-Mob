import { useEffect, useState } from "react";
import { resourcesAt, type Village } from "@ds-mob/core";

const demoVillage: Village = {
  id: "v1",
  ownerId: "me",
  coord: { x: 500, y: 500 },
  name: "Mein Startdorf",
  buildings: {
    main: 1, barracks: 0, stable: 0, garage: 0, academy: 0, smithy: 0, rally: 1,
    statue: 0, market: 0, wood: 1, stone: 1, iron: 1, farm: 1, storage: 1, hide: 0,
    wall: 0, church: 0, watchtower: 0,
  },
  units: {
    spear: 0, sword: 0, axe: 0, archer: 0, scout: 0, lightCav: 0, mountedArcher: 0,
    heavyCav: 0, ram: 0, catapult: 0, paladin: 0, nobleman: 0, militia: 0,
  },
  resources: { wood: 0, stone: 0, iron: 0 },
  lastUpdateMs: Date.now(),
  loyalty: 100,
};

export function App() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const r = resourcesAt(demoVillage, now);

  return (
    <main className="app">
      <header className="bar">
        <span>🌲 {Math.floor(r.wood)}</span>
        <span>🧱 {Math.floor(r.stone)}</span>
        <span>⛏️ {Math.floor(r.iron)}</span>
      </header>
      <section className="village">
        <h1>{demoVillage.name}</h1>
        <p className="coord">({demoVillage.coord.x} | {demoVillage.coord.y})</p>
        <p>Phase 0 läuft — Kern-Engine und Basis-Scaffolding sind da.</p>
      </section>
    </main>
  );
}
