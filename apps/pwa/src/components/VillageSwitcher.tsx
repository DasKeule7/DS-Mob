import type { Village } from "@ds-mob/core";

interface Props {
  villages: Village[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function VillageSwitcher({ villages, activeId, onSelect }: Props) {
  if (villages.length <= 1) return null;
  return (
    <div className="switcher">
      {villages.map((v) => (
        <button
          type="button"
          key={v.id}
          className={"switcherItem" + (v.id === activeId ? " active" : "")}
          onClick={() => onSelect(v.id)}
        >
          <strong>{v.name}</strong>
          <span className="subtle">({v.coord.x} | {v.coord.y})</span>
        </button>
      ))}
    </div>
  );
}
