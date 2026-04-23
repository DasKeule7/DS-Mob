import { get, set, del, createStore } from "idb-keyval";
import type { WorldState } from "@ds-mob/core";
import type { StorageAdapter } from "./adapter.js";

// IndexedDB-Persistenz. Ein Datensatz pro "Welt" (Key = worldId), damit wir
// in Zukunft mehrere lokale Welten nebeneinander halten können.
export class IndexedDbStorage implements StorageAdapter {
  private readonly store: ReturnType<typeof createStore>;
  private readonly key: string;

  constructor(dbName = "ds-mob", storeName = "world", worldId = "default") {
    this.store = createStore(dbName, storeName);
    this.key = worldId;
  }

  async load(): Promise<WorldState | null> {
    const value = await get<WorldState>(this.key, this.store);
    return value ?? null;
  }
  async save(state: WorldState): Promise<void> {
    await set(this.key, state, this.store);
  }
  async clear(): Promise<void> {
    await del(this.key, this.store);
  }
}
