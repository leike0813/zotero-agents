## 1. OpenSpec and Contracts

- [x] Add ACP Chat direct transcript rendering delta specs.
- [x] Mark ACP Chat page/delta protocol as removed from the active UI contract.

## 2. Store and Snapshot Model

- [x] Convert ACP Chat session slots to full transcript mirrors for active/foreground conversations.
- [x] Add foreground transcript loading/failed/ready state to ACP Chat snapshots.
- [x] Hydrate cold foreground conversations from JSONL in the background without blocking selection.
- [x] Keep transcript-only streaming updates from touching structural timestamps.

## 3. Host and Front-End Simplification

- [x] Remove ACP Chat page/delta host actions, subscriptions, and child snapshots.
- [x] Remove ACP Chat front-end page/delta cache and render directly from snapshot items.
- [x] Split ACP Chat transcript rendering from non-transcript panel region rendering.
- [x] Project the session drawer from all backend chat sessions.

## 4. Tests and Validation

- [x] Update ACP Chat store tests for mirror snapshots, cold hydrate, and removed deltas.
- [x] Update UI smoke tests for removed page/delta protocol, loading state, refresh split, and all-backend drawer sessions.
- [x] Run strict OpenSpec validation, targeted tests, typecheck, lint, and build.
