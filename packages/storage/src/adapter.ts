import type { WorldState } from "@ds-mob/core";

// Abstraktes Persistenz-Interface. Jede Implementierung (IndexedDB lokal,
// HTTP-Client später) erfüllt denselben Vertrag — Game-Logic bleibt dadurch
// unverändert, wenn wir in Phase 6 auf den Server umstellen.
export interface StorageAdapter {
  load(): Promise<WorldState | null>;
  save(state: WorldState): Promise<void>;
  clear(): Promise<void>;
}
