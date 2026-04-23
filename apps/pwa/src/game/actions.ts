import {
  advanceTo,
  enqueueBuild as simEnqueueBuild,
  cancelBuild as simCancelBuild,
  enqueueRecruit as simEnqueueRecruit,
  sendAttack as simSendAttack,
  type WorldState,
  type BuildingId,
  type UnitId,
} from "@ds-mob/core";
import { FARM_CAPACITY } from "@ds-mob/core";

function currentFarmCap(world: WorldState, villageId: string): number {
  const v = world.villages[villageId];
  if (!v) return 0;
  const lvl = v.buildings.farm;
  return FARM_CAPACITY[Math.max(0, Math.min(lvl, FARM_CAPACITY.length - 1))] ?? 240;
}

export function actEnqueueBuild(
  state: WorldState,
  villageId: string,
  building: BuildingId,
  nowMs: number,
): { ok: true; state: WorldState } | { ok: false; error: string } {
  const advanced = advanceTo(state, nowMs);
  const v = advanced.villages[villageId];
  if (!v) return { ok: false, error: "Dorf unbekannt." };
  const r = simEnqueueBuild(v, building, nowMs, { worldSpeed: advanced.config.speed });
  if (!r.ok) return { ok: false, error: r.error.message };
  return { ok: true, state: { ...advanced, villages: { ...advanced.villages, [villageId]: r.village } } };
}

export function actCancelBuild(state: WorldState, villageId: string, queueIndex: number, nowMs: number): WorldState {
  const advanced = advanceTo(state, nowMs);
  const v = advanced.villages[villageId];
  if (!v) return advanced;
  const updated = simCancelBuild(v, queueIndex);
  return { ...advanced, villages: { ...advanced.villages, [villageId]: updated } };
}

export function actEnqueueRecruit(
  state: WorldState,
  villageId: string,
  unit: UnitId,
  count: number,
  nowMs: number,
): { ok: true; state: WorldState } | { ok: false; error: string } {
  const advanced = advanceTo(state, nowMs);
  const v = advanced.villages[villageId];
  if (!v) return { ok: false, error: "Dorf unbekannt." };
  const r = simEnqueueRecruit(v, unit, count, nowMs, {
    worldSpeed: advanced.config.speed,
    farmCap: currentFarmCap(advanced, villageId),
  });
  if (!r.ok) return { ok: false, error: r.error.message };
  return { ok: true, state: { ...advanced, villages: { ...advanced.villages, [villageId]: r.village } } };
}

export function actSendAttack(
  state: WorldState,
  fromVillageId: string,
  toVillageId: string,
  units: Partial<Record<UnitId, number>>,
  nowMs: number,
): { ok: true; state: WorldState } | { ok: false; error: string } {
  const advanced = advanceTo(state, nowMs);
  const r = simSendAttack(advanced, { fromVillageId, toVillageId, units, nowMs });
  if (!r.ok) return { ok: false, error: r.error.message };
  return { ok: true, state: r.state };
}

export function actMarkReportRead(state: WorldState, reportId: string): WorldState {
  return { ...state, reports: state.reports.map((r) => (r.id === reportId ? { ...r, read: true } : r)) };
}
