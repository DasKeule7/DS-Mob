import { useMemo, useState } from "react";
import {
  UNITS,
  previewAttack,
  type UnitId,
  type Village,
  type WorldState,
} from "@ds-mob/core";
import { UNIT_LABELS } from "./buildingLabels.js";
import { formatDuration } from "./BuildQueue.js";

interface Props {
  world: WorldState;
  fromVillageId: string;
  toVillage: Village;
  onClose: () => void;
  onSend: (units: Partial<Record<UnitId, number>>) => void;
}

export function AttackDialog({ world, fromVillageId, toVillage, onClose, onSend }: Props) {
  const from = world.villages[fromVillageId];
  const [selection, setSelection] = useState<Record<UnitId, string>>({
    spear: "", sword: "", axe: "", archer: "", scout: "", lightCav: "", mountedArcher: "",
    heavyCav: "", ram: "", catapult: "", paladin: "", nobleman: "", militia: "",
  });

  const parsed: Partial<Record<UnitId, number>> = useMemo(() => {
    const out: Partial<Record<UnitId, number>> = {};
    for (const id of Object.keys(selection) as UnitId[]) {
      const n = Math.max(0, Math.floor(Number(selection[id]) || 0));
      if (n > 0) out[id] = n;
    }
    return out;
  }, [selection]);

  const total = Object.values(parsed).reduce((s, v) => s + (v ?? 0), 0);
  const preview = total > 0 ? previewAttack(world, fromVillageId, toVillage.id, parsed, Date.now()) : null;

  if (!from) return null;
  const available = from.units;
  const overLimit = (Object.keys(parsed) as UnitId[]).some((id) => (parsed[id] ?? 0) > available[id]);
  const canSend = total > 0 && !overLimit;

  return (
    <div className="sheetBackdrop" role="dialog" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheetHeader">
          <span className="sheetIcon">⚔️</span>
          <div>
            <h2>Angriff</h2>
            <p className="sheetLevel">→ {toVillage.name} ({toVillage.coord.x} | {toVillage.coord.y})</p>
          </div>
          <button type="button" className="sheetClose" onClick={onClose}>✕</button>
        </header>

        <div className="attackList">
          {(Object.keys(UNITS) as UnitId[])
            .filter((id) => id !== "militia" && available[id] > 0)
            .map((id) => (
              <div className="attackRow" key={id}>
                <div className="attackRowInfo">
                  <strong>{UNIT_LABELS[id]}</strong>
                  <span className="subtle">verfügbar: {available[id]}</span>
                </div>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={selection[id]}
                  placeholder="0"
                  onChange={(e) => setSelection((s) => ({ ...s, [id]: e.target.value.replace(/\D/g, "") }))}
                  aria-label={UNIT_LABELS[id]}
                />
                <button type="button" className="chipButton" onClick={() => setSelection((s) => ({ ...s, [id]: String(available[id]) }))}>
                  max
                </button>
              </div>
            ))}
          {(Object.keys(UNITS) as UnitId[]).every((id) => available[id] === 0) && (
            <p className="sheetNote">Keine Truppen verfügbar.</p>
          )}
        </div>

        {preview && (
          <ul className="costList">
            <li>📏 {preview.distanceFields.toFixed(1)} Felder</li>
            <li>⏱ {formatDuration(preview.travelMs)}</li>
            <li>🎒 {preview.carry}</li>
          </ul>
        )}

        <button
          type="button"
          className="sheetButton primary"
          disabled={!canSend}
          onClick={() => canSend && onSend(parsed)}
        >
          {overLimit ? "Mehr angefragt als verfügbar" : total > 0 ? "Angriff senden" : "Truppen wählen"}
        </button>
      </div>
    </div>
  );
}
