import { useState } from "react";
import type { BuildingId } from "@ds-mob/core";
import { useGame } from "../game/GameProvider.js";
import { actEnqueueBuild, actCancelBuild } from "../game/actions.js";
import { ResourceBar } from "../components/ResourceBar.js";
import { BuildingGrid } from "../components/BuildingGrid.js";
import { BuildQueue } from "../components/BuildQueue.js";
import { BuildingSheet } from "../components/BuildingSheet.js";

export function VillageScreen({ villageId }: { villageId: string }) {
  const { world, applyWorld } = useGame();
  const [selected, setSelected] = useState<BuildingId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!world) return null;
  const village = world.villages[villageId];
  if (!village) return <p className="placeholder">Dorf nicht gefunden.</p>;

  const showError = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="screen">
      <ResourceBar village={village} worldSpeed={world.config.speed} />
      <section className="villageHeader">
        <h1>{village.name}</h1>
        <p className="coord">({village.coord.x} | {village.coord.y})</p>
      </section>
      <section className="queueSection">
        <h2>Bau-Warteschlange</h2>
        <BuildQueue
          village={village}
          onCancel={(i) => {
            const next = actCancelBuild(world, villageId, i, Date.now());
            applyWorld(next);
          }}
        />
      </section>
      <BuildingGrid village={village} onSelect={(b) => setSelected(b)} />
      {selected && (
        <BuildingSheet
          village={village}
          building={selected}
          worldSpeed={world.config.speed}
          onClose={() => setSelected(null)}
          onUpgrade={() => {
            const r = actEnqueueBuild(world, villageId, selected, Date.now());
            if (r.ok) {
              applyWorld(r.state);
              setSelected(null);
            } else {
              showError(r.error);
            }
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
