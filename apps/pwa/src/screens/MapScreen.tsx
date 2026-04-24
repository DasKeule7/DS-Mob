import { useState } from "react";
import { BARBARIAN_OWNER_ID } from "@ds-mob/core";
import { useGame } from "../game/GameProvider.js";
import { actSendAttack, actSendSupport } from "../game/actions.js";
import { MapView } from "../components/MapView.js";
import { VillagePopover } from "../components/VillagePopover.js";
import { AttackDialog, type SendMode } from "../components/AttackDialog.js";

export function MapScreen({ myVillageId, myOwnerId }: { myVillageId: string; myOwnerId: string }) {
  const { world, applyWorld } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ toId: string; mode: SendMode } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!world) return null;
  const selectedVillage = selected ? world.villages[selected] : null;
  const dialogTarget = dialog ? world.villages[dialog.toId] : null;

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
          isMine={selectedVillage.ownerId === myOwnerId}
          canSupport={selectedVillage.ownerId === myOwnerId && selectedVillage.id !== myVillageId}
          onAttack={() => {
            setDialog({ toId: selectedVillage.id, mode: "attack" });
            setSelected(null);
          }}
          onSupport={() => {
            setDialog({ toId: selectedVillage.id, mode: "support" });
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {dialog && dialogTarget && (
        <AttackDialog
          world={world}
          fromVillageId={myVillageId}
          toVillage={dialogTarget}
          mode={dialog.mode}
          allowSupport={dialogTarget.ownerId === myOwnerId && dialogTarget.id !== myVillageId}
          onModeChange={(m) => setDialog({ toId: dialog.toId, mode: m })}
          onClose={() => setDialog(null)}
          onSend={(units, mode) => {
            const r = mode === "attack"
              ? actSendAttack(world, myVillageId, dialogTarget.id, units, Date.now())
              : actSendSupport(world, myVillageId, dialogTarget.id, units, Date.now());
            if (r.ok) {
              applyWorld(r.state);
              setDialog(null);
              const name = dialogTarget.ownerId === BARBARIAN_OWNER_ID ? "Barbarendorf" : dialogTarget.name;
              showToast(`${mode === "attack" ? "Angriff" : "Unterstützung"} → ${name}`);
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
