import { useEffect, useState } from "react";
import { BARBARIAN_OWNER_ID } from "@ds-mob/core";
import { useGame } from "../game/GameProvider.js";
import { actSendAttack, actSendSupport } from "../game/actions.js";
import { MapView, type MapFilters } from "../components/MapView.js";
import { VillagePopover } from "../components/VillagePopover.js";
import { AttackDialog, type SendMode } from "../components/AttackDialog.js";

export function MapScreen({ myVillageId, myOwnerId }: { myVillageId: string; myOwnerId: string }) {
  const { world, applyWorld } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ toId: string; mode: SendMode } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>({ showOwn: true, showBarb: true, showEnemy: true });
  const [jumpX, setJumpX] = useState("");
  const [jumpY, setJumpY] = useState("");
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);

  // Karte initial auf das aktive Dorf zentrieren.
  useEffect(() => {
    if (center) return;
    const me = world?.villages[myVillageId];
    if (me) setCenter(me.coord);
  }, [world, myVillageId, center]);

  if (!world) return null;
  const effectiveCenter = center ?? world.villages[myVillageId]?.coord ?? { x: 100, y: 100 };
  const selectedVillage = selected ? world.villages[selected] : null;
  const dialogTarget = dialog ? world.villages[dialog.toId] : null;
  const me = world.players[myOwnerId];
  const myVillageIds = me?.villageIds ?? [myVillageId];

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const doJump = () => {
    const x = parseInt(jumpX, 10);
    const y = parseInt(jumpY, 10);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setCenter({ x, y });
  };

  return (
    <div className="screen mapScreen">
      <div className="mapFilters">
        <FilterChip active={filters.showOwn} onToggle={() => setFilters((f) => ({ ...f, showOwn: !f.showOwn }))} dotClass="me">Eigene</FilterChip>
        <FilterChip active={filters.showBarb} onToggle={() => setFilters((f) => ({ ...f, showBarb: !f.showBarb }))} dotClass="barb">Barbaren</FilterChip>
        <FilterChip active={filters.showEnemy} onToggle={() => setFilters((f) => ({ ...f, showEnemy: !f.showEnemy }))} dotClass="enemy">Gegner</FilterChip>
        <form
          className="jumpForm"
          onSubmit={(e) => {
            e.preventDefault();
            doJump();
          }}
        >
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="x"
            value={jumpX}
            onChange={(e) => setJumpX(e.target.value.replace(/\D/g, ""))}
            aria-label="X-Koordinate"
          />
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="y"
            value={jumpY}
            onChange={(e) => setJumpY(e.target.value.replace(/\D/g, ""))}
            aria-label="Y-Koordinate"
          />
          <button type="submit" className="chipButton">→</button>
        </form>
      </div>
      <MapView
        world={world}
        myVillageId={myVillageId}
        myVillageIds={myVillageIds}
        myOwnerId={myOwnerId}
        filters={filters}
        center={effectiveCenter}
        onCenterChange={setCenter}
        onSelect={(id) => setSelected(id)}
      />
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

function FilterChip({ active, onToggle, dotClass, children }: { active: boolean; onToggle: () => void; dotClass: string; children: React.ReactNode }) {
  return (
    <button type="button" className={"filterChip" + (active ? " active" : "")} onClick={onToggle}>
      <span className={"dot " + dotClass} /> {children}
    </button>
  );
}
