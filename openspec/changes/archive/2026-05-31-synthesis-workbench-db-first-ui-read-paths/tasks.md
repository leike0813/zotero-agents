## 1. OpenSpec

- [x] Create change scaffold.
- [x] Add proposal, design, specs, and tasks.

## 2. DB-first Workbench Read Paths

- [x] Audit `getSynthesisSnapshotInput()` and UI option APIs for legacy
  projection/file/task fallback.
- [x] Remove file-backed fallback from Workbench Home, Topics, Cleanup,
  Deleted Artifacts, Conflicts, Registry summary, Graph, and Background Jobs.
- [x] Keep explicit import/export/checkpoint/debug readers out of normal UI
  snapshot assembly.

## 3. Citation Graph DB Layout

- [x] Add additive repository schema for citation graph layout state.
- [x] Add repository APIs for read/upsert/running/failed layout state.
- [x] Update reset/clean-install behavior to clear layout state with other
  Synthesis runtime tables.
- [x] Make `runCitationGraphLayoutWorker()` read DB graph rows, compute layout,
  write DB layout state, and report job progress.
- [x] Add `citationGraphLayout` to `debug.synthesis.worker.run`.

## 4. Workbench Graph UI

- [x] Build graph snapshot from DB graph rows plus DB layout state.
- [x] Automatically refresh layout when Graph tab opens or preset changes.
- [x] Render graph data when structure exists even if layout is missing, dirty,
  running, or failed.
- [x] Show drawing/refreshing messaging without using the old rebuild gate.

## 5. Tests and Verification

- [x] Add/extend tests for stale legacy files with empty DB producing empty UI.
- [x] Add repository layout state tests.
- [x] Add service layout worker and stale-layout tests.
- [x] Add UI graph rendering tests for non-ready layout states.
- [x] Run targeted Synthesis UI/repository/update tests, TypeScript, prettier
  check, eslint, and build.
