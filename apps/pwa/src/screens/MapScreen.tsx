import { useState } from "react";
import { BARBARIAN_OWNER_ID } from "@ds-mob/core";
import { useGame } from "../game/GameProvider.js";
import { actSendAttack } from "../game/actions.js";
import { MapView } from "../components/MapView.js";
import { VillagePopover } from "../components/VillagePopover.js";
import { AttackDialog } from "../components/AttackDialog.js";

export function MapScreen({ myVillageId }: { myVillageId: string }) {
  const { world, applyWorld } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [attacking, setAttacking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!world) return null;
  const selectedVillage = selected ? world.villages[selected] : null;
  const attackingVillage = attacking ? world.villages[attacking] : null;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="screen mapScreen">
      <MapView world={world} myVillageId={myVillageId} onSelect={(id) => setSelected(id)} />
      <div className="mapLegend">
        <span><span className="dot me" /> Du</span>
        <span><span className="dot barb" /> Barbar</span>
        <span><span className="dot enemy" /> Gegner</span>
      </div>
      {selectedVillage && (
        <VillagePopover
          village={selectedVillage}
          isMine={selectedVillage.id === myVillageId}
          onAttack={() => {
            setAttacking(selectedVillage.id);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {attackingVillage && (
        <AttackDialog
          world={world}
          fromVillageId={myVillageId}
          toVillage={attackingVillage}
          onClose={() => setAttacking(null)}
          onSend={(units) => {
            const r = actSendAttack(world, myVillageId, attackingVillage.id, units, Date.now());
            if (r.ok) {
              applyWorld(r.state);
              setAttacking(null);
              const name = attackingVillage.ownerId === BARBARIAN_OWNER_ID ? "Barbarendorf" : attackingVillage.name;
              showToast(`Angriff gegen ${name} unterwegs.`);
            } else {
              showToast(r.error);
            }
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
