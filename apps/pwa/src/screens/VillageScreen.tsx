import { useState } from "react";
import type { BuildingId, UnitId } from "@ds-mob/core";
import { useGame } from "../game/GameProvider.js";
import {
  actEnqueueBuild,
  actCancelBuild,
  actEnqueueRecruit,
  actMintCoin,
  actRecallSupport,
} from "../game/actions.js";
import { ResourceBar } from "../components/ResourceBar.js";
import { BuildingGrid } from "../components/BuildingGrid.js";
import { BuildQueue } from "../components/BuildQueue.js";
import { BuildingSheet } from "../components/BuildingSheet.js";
import { FlightsPanel } from "../components/FlightsPanel.js";

interface Props {
  villageId: string;
}

export function VillageScreen({ villageId }: Props) {
  const { world, applyWorld } = useGame();
  const [selected, setSelected] = useState<BuildingId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!world) return null;
  const village = world.villages[villageId];
  if (!village) return <p className="placeholder">Dorf nicht gefunden.</p>;
  const player = world.players[village.ownerId];

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
      {player && (
        <FlightsPanel
          world={world}
          village={village}
          ownerId={player.id}
          onRecallSupport={(supportId) => {
            const r = actRecallSupport(world, villageId, supportId, Date.now());
            if (r.ok) applyWorld(r.state);
            else showError(r.error);
          }}
        />
      )}
      <BuildingGrid village={village} onSelect={(b) => setSelected(b)} />
      {selected && (
        <BuildingSheet
          village={village}
          building={selected}
          worldSpeed={world.config.speed}
          player={player}
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
          onRecruit={(unit: UnitId, count: number) => {
            const r = actEnqueueRecruit(world, villageId, unit, count, Date.now());
            if (r.ok) applyWorld(r.state);
            else showError(r.error);
          }}
          onMintCoin={() => {
            const r = actMintCoin(world, villageId, Date.now());
            if (r.ok) applyWorld(r.state);
            else showError(r.error);
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
