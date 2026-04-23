import type { WorldState } from "@ds-mob/core";
import type { StorageAdapter } from "./adapter.js";

// In-Memory-Adapter für Tests und SSR.
export class MemoryStorage implements StorageAdapter {
  private state: WorldState | null = null;

  async load(): Promise<WorldState | null> {
    return this.state;
  }
  async save(state: WorldState): Promise<void> {
    this.state = state;
  }
  async clear(): Promise<void> {
    this.state = null;
  }
}
