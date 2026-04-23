# DS-Mob

Mobiler Strategie-Klon (PWA) im Stil klassischer Browser-Strategiespiele.
Architektur: pnpm-Monorepo mit pure-TypeScript-Core (`@ds-mob/core`), PWA-Client
(`@ds-mob/pwa`) und vorbereiteter Multiplayer-Migration.

## Projekt-Struktur

```
ds-mob/
├── apps/pwa/           # Vite + React + vite-plugin-pwa
├── packages/core/      # Spielregeln, Balancing-Daten, Simulation (pure TS)
└── .github/workflows/  # CI
```

## Entwicklung

```bash
pnpm install
pnpm dev          # startet PWA-Dev-Server auf http://localhost:5173
pnpm test         # Vitest (Referenztests gegen Balancing)
pnpm typecheck
pnpm build
```

## Status

Phase 0 (Scaffolding) + Teile von Phase 1 (Produktions-Simulation + Tests)
sind eingecheckt. Nächste Schritte: Bau-/Rekrutierungs-Queues, Kampfformel,
Dorfübersicht-UI.
