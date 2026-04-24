import { useState } from "react";
import { UNITS, type Report, type UnitId } from "@ds-mob/core";
import { useGame } from "../game/GameProvider.js";
import { actMarkReportRead } from "../game/actions.js";
import { UNIT_LABELS } from "../components/buildingLabels.js";

export function ReportsScreen() {
  const { world, applyWorld } = useGame();
  const [openId, setOpenId] = useState<string | null>(null);
  if (!world) return null;
  const reports = world.reports;
  const open = openId ? reports.find((r) => r.id === openId) ?? null : null;

  return (
    <div className="screen reportsScreen">
      <h1>Berichte</h1>
      {reports.length === 0 && <p className="subtle">Noch keine Kampfberichte.</p>}
      <ul className="reportList">
        {reports.map((r) => {
          const attacker = world.villages[r.fromVillageId];
          const defender = world.villages[r.toVillageId];
          const icon = r.takeover ? "👑" : r.winner === "attacker" ? "✅" : r.winner === "defender" ? "❌" : "➖";
          return (
            <li key={r.id}>
              <button
                type="button"
                className={"reportItem" + (r.read ? " read" : "")}
                onClick={() => {
                  setOpenId(r.id);
                  if (!r.read) applyWorld(actMarkReportRead(world, r.id));
                }}
              >
                <span className="reportIcon">{icon}</span>
                <div className="reportInfo">
                  <strong>{defender?.name ?? "Ziel"}</strong>
                  <span className="subtle">
                    {new Date(r.atMs).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                    {attacker ? ` · von ${attacker.name}` : ""}
                    {r.takeover ? " · erobert" : r.loyaltyAfter !== undefined ? ` · Zustimmung ${r.loyaltyAfter}` : ""}
                  </span>
                </div>
                {r.loot && (r.loot.wood + r.loot.stone + r.loot.iron > 0) ? (
                  <span className="reportLoot">
                    +{(r.loot.wood + r.loot.stone + r.loot.iron).toLocaleString("de-DE")}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {open && <ReportDetail report={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ReportDetail({ report, onClose }: { report: Report; onClose: () => void }) {
  return (
    <div className="sheetBackdrop" onClick={onClose} role="dialog">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheetHeader">
          <span className="sheetIcon">{report.winner === "attacker" ? "✅" : report.winner === "defender" ? "❌" : "➖"}</span>
          <div>
            <h2>Kampfbericht</h2>
            <p className="sheetLevel">{new Date(report.atMs).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</p>
          </div>
          <button type="button" className="sheetClose" onClick={onClose}>✕</button>
        </header>
        <h3>Angreifer</h3>
        <UnitTable initial={report.attackerUnits} survived={report.attackerSurvivors} />
        <h3>Verteidiger</h3>
        <UnitTable initial={report.defenderUnits} survived={report.defenderSurvivors} />
        <p className="sheetNote">
          Wall: {report.effectiveWallLevel} (nominal {report.wallLevel}) · Glück {report.luckPercent.toFixed(1)} %
        </p>
        {report.loyaltyDrop !== undefined && (
          <p className="sheetNote">
            Zustimmung: −{report.loyaltyDrop} → <strong>{report.loyaltyAfter}</strong>
            {report.takeover ? " · Dorf erobert" : ""}
          </p>
        )}
        {report.loot && (
          <p className="sheetNote">
            Beute: 🌲 {report.loot.wood} · 🧱 {report.loot.stone} · ⛏️ {report.loot.iron}
          </p>
        )}
      </div>
    </div>
  );
}

function UnitTable({ initial, survived }: { initial: Partial<Record<UnitId, number>>; survived: Partial<Record<UnitId, number>> }) {
  const keys = (Object.keys(UNITS) as UnitId[]).filter((id) => (initial[id] ?? 0) > 0);
  if (keys.length === 0) return <p className="sheetNote">—</p>;
  return (
    <table className="unitTable">
      <thead>
        <tr><th>Einheit</th><th>Start</th><th>Überlebt</th></tr>
      </thead>
      <tbody>
        {keys.map((id) => (
          <tr key={id}>
            <td>{UNIT_LABELS[id]}</td>
            <td>{initial[id]}</td>
            <td>{survived[id] ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
