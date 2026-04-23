import { BARBARIAN_OWNER_ID, type Village } from "@ds-mob/core";

interface Props {
  village: Village;
  isMine: boolean;
  onAttack: () => void;
  onClose: () => void;
}

export function VillagePopover({ village, isMine, onAttack, onClose }: Props) {
  return (
    <div className="sheetBackdrop" role="dialog" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheetHeader">
          <span className="sheetIcon">{isMine ? "🏘️" : village.ownerId === BARBARIAN_OWNER_ID ? "🪓" : "🏴"}</span>
          <div>
            <h2>{village.name}</h2>
            <p className="sheetLevel">({village.coord.x} | {village.coord.y})</p>
          </div>
          <button type="button" className="sheetClose" onClick={onClose}>✕</button>
        </header>
        {isMine ? (
          <p className="sheetNote">Dein Dorf.</p>
        ) : (
          <button type="button" className="sheetButton primary" onClick={onAttack}>
            Angriff starten
          </button>
        )}
      </div>
    </div>
  );
}
