## 1. Store and Snapshot Model

- [x] Restore `selectedRun.transcriptItems` as the ACP Skills front-end transcript contract.
- [x] Add selected-run snapshot preparation that returns run state immediately and schedules cold foreground hydrate.
- [x] Make `selectAcpSkillRun()` commit selection immediately and schedule foreground hydrate before emitting changes.
- [x] Keep full mirrors for lifecycle-open and foreground selected runs; remove partial mirror UI semantics.

## 2. Wire Protocol and Front-End Simplification

- [x] Remove ACP Skills `load-transcript-page`, `transcript-page`, and `transcript-delta` host/front-end paths.
- [x] Remove front-end transcript page/delta caches, revision guards, cursors, and resync state.
- [x] Render ACP Skills transcript directly from `selectedRun.transcriptItems`.

## 3. JSONL Persistence

- [x] Batch ACP Skills transcript JSONL writes outside the live rendering path.
- [x] Preserve strong flush behavior for hydrate, shutdown, recovery, and tests.

## 4. Tests and Validation

- [x] Update store tests for direct selected-run transcript snapshots, cold hydrate, mirror release, and recovery append.
- [x] Update host/front-end tests to assert the ACP Skills page/delta protocol is absent.
- [x] Run strict OpenSpec validation, targeted ACP tests, typecheck, lint, and build.

## 5. Lifecycle Boundary Follow-up

- [x] Retain mirrors until the ACP run lifecycle is settled, not merely until prompt stops.
- [x] Make selected-run state snapshots return without awaiting cold transcript hydrate.
- [x] Add selected transcript loading/failed state and render a spinner while JSONL hydrate runs.
- [x] Keep transcript-only prompting updates from rebuilding non-transcript drawer/panel regions.
- [x] Update regression tests and rerun targeted validation.
