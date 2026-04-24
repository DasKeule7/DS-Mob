import { useEffect, useState } from "react";
import { UNITS, type Flight, type Village, type WorldState } from "@ds-mob/core";
import { formatDuration } from "./BuildQueue.js";

interface Props {
  world: WorldState;
  village: Village;
  ownerId: string;
  onRecallSupport: (supportId: string) => void;
}

export function FlightsPanel({ world, village, ownerId, onRecallSupport }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const outgoing = world.flights.filter((f) => f.fromVillageId === village.id && f.ownerId === ownerId);
  const incoming = world.flights.filter((f) => f.toVillageId === village.id);

  const mySupports = village.supports.filter((s) => s.ownerId === ownerId);
  const foreignSupports = village.supports.filter((s) => s.ownerId !== ownerId);

  if (outgoing.length === 0 && incoming.length === 0 && village.supports.length === 0) return null;

  return (
    <section className="flightsSection">
      {incoming.length > 0 && (
        <>
          <h2>Ankommend</h2>
          <ul className="queue">
            {incoming.map((f) => (
              <li key={f.id} className="queueItem">
                <FlightLabel flight={f} world={world} directionHint="from" />
                <span className="queueTime">{formatDuration(Math.max(0, f.arriveMs - now))}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {outgoing.length > 0 && (
        <>
          <h2>Unterwegs</h2>
          <ul className="queue">
            {outgoing.map((f) => (
              <li key={f.id} className="queueItem">
                <FlightLabel flight={f} world={world} directionHint="to" />
                <span className="queueTime">{formatDuration(Math.max(0, f.arriveMs - now))}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {mySupports.length > 0 && (
        <>
          <h2>Stationierte Truppen</h2>
          <ul className="queue">
            {mySupports.map((s) => {
              const origin = world.villages[s.fromVillageId];
              const total = Object.values(s.units).reduce((a, b) => a + (b ?? 0), 0);
              return (
                <li key={s.id} className="queueItem">
                  <div className="queueInfo">
                    <strong>bei {village.name}</strong>
                    <span className="queueLevel">aus {origin?.name ?? s.fromVillageId} · {total} Truppen</span>
                  </div>
                  <button type="button" className="queueCancel" onClick={() => onRecallSupport(s.id)}>Zurückrufen</button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {foreignSupports.length > 0 && (
        <>
          <h2>Fremde Unterstützung</h2>
          <ul className="queue">
            {foreignSupports.map((s) => {
              const total = Object.values(s.units).reduce((a, b) => a + (b ?? 0), 0);
              return (
                <li key={s.id} className="queueItem">
                  <div className="queueInfo">
                    <strong>{world.players[s.ownerId]?.name ?? s.ownerId}</strong>
                    <span className="queueLevel">{total} Truppen</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function FlightLabel({ flight, world, directionHint }: { flight: Flight; world: WorldState; directionHint: "to" | "from" }) {
  const target = directionHint === "to" ? world.villages[flight.toVillageId] : world.villages[flight.fromVillageId];
  const total = Object.values(flight.units).reduce((a, b) => a + (b ?? 0), 0);
  const label = flight.mode === "attack" ? "Angriff" : flight.mode === "support" ? "Unterstützung" : "Rückkehr";
  const icon = flight.mode === "attack" ? "⚔️" : flight.mode === "support" ? "🛡️" : "↩️";
  return (
    <div className="queueInfo">
      <strong>{icon} {label}</strong>
      <span className="queueLevel">
        {directionHint === "to" ? "→" : "←"} {target?.name ?? flight.toVillageId} · {total} Truppen
        {flight.mode === "return" && hasCarry(flight) ? ` · 🎒 ${totalLoot(flight)}` : ""}
      </span>
    </div>
  );
}

function hasCarry(f: Flight): boolean {
  return !!f.loot && (f.loot.wood + f.loot.stone + f.loot.iron) > 0;
}

function totalLoot(f: Flight): number {
  return f.loot ? f.loot.wood + f.loot.stone + f.loot.iron : 0;
}

// Helfer wird aktuell nicht anderweitig genutzt — vorhalten für Ausbau.
export function carryOfUnits(units: Partial<Record<string, number>>): number {
  let s = 0;
  for (const id of Object.keys(units)) {
    const n = (units[id] as number) ?? 0;
    // @ts-expect-error UNITS-Zugriff via String-ID auf schmaleren Typen
    s += n * (UNITS[id]?.carry ?? 0);
  }
  return s;
}
