## 1. Boundary Foundation

- [x] Add a centralized Synthesis file-root resolver that maps historical data-root callers away from `<persistence>/data/synthesis`.
- [x] Update clean-install reset to remove both data-root and runtime-root Synthesis file residues.
- [x] Add regression coverage that normal snapshot/rebuild/worker flows do not create `<persistence>/data/synthesis`.

## 2. Hot Path DB-First Cleanup

- [x] Move topic artifact index/freshness/deleted/conflict state from JSON helpers into repository-backed records.
- [x] Stop literature registry and citation graph rebuild from writing canonical/projection JSON during normal rebuild.
- [x] Stop topic graph/concept/tag projection rebuild commands from writing `state/*-index.json` during normal Workbench use.
- [x] Move literature registry job state JSON to `synt_job_state`/repository state only.

## 3. Explicit File Artifact Boundary

- [x] Keep checkpoint/export/debug dump commands available but make their output path explicit or non-data runtime/debug.
- [x] Ensure Git Sync/mirror render DB-backed temporary export bundles instead of copying `data/synthesis`.
- [x] Keep old `data/synthesis` files readable only through explicit import/debug commands.

## 4. Verification

- [x] Run targeted Synthesis UI/update/repository tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run formatting/lint checks on touched source and tests.
