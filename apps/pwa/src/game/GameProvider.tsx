import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { advanceTo, type WorldState } from "@ds-mob/core";
import { IndexedDbStorage, type StorageAdapter } from "@ds-mob/storage";
import { createNewWorld } from "./newGame.js";

interface GameContextValue {
  world: WorldState | null;
  status: "loading" | "ready" | "error";
  error: string | null;
  applyWorld: (next: WorldState) => void;
  newGame: (opts: { playerName: string; villageName: string }) => void;
  resetAll: () => void;
  nowMs: number;
}

const GameContext = createContext<GameContextValue | null>(null);

interface Props {
  children: ReactNode;
  storage?: StorageAdapter;
}

export function GameProvider({ children, storage: injected }: Props) {
  const storage = useMemo<StorageAdapter>(() => injected ?? new IndexedDbStorage(), [injected]);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [status, setStatus] = useState<GameContextValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    storage.load().then(
      (loaded) => {
        if (cancelled) return;
        setWorld(loaded);
        setStatus("ready");
      },
      (err) => {
        if (cancelled) return;
        setError(String(err));
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [storage]);

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Persistiert Welt debounced nach State-Änderungen.
  useEffect(() => {
    if (!world) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void storage.save(world);
    }, 500);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [world, storage]);

  // advanceTo alle 5 s, damit Bau-/Rekrutierungs-Events automatisch schließen,
  // auch wenn der Spieler keine Aktion auslöst.
  useEffect(() => {
    if (!world) return;
    const id = window.setInterval(() => {
      setWorld((curr) => (curr ? advanceTo(curr, Date.now()) : curr));
    }, 5_000);
    return () => window.clearInterval(id);
  }, [world != null]);

  const ctx: GameContextValue = {
    world,
    status,
    error,
    nowMs,
    applyWorld: (next) => setWorld(next),
    newGame: ({ playerName, villageName }) => {
      setWorld(createNewWorld({ playerName, villageName, nowMs: Date.now() }));
    },
    resetAll: () => {
      void storage.clear().then(() => setWorld(null));
    },
  };

  return <GameContext.Provider value={ctx}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
