## Why

Round4 replay shows that ACP Chat target-active still falls out of steady incremental rendering: the shared browser receiver commits a new page without committing its item indexes, so the next delta against a newly inserted item is rejected as a gap and amplified into repeated rebase snapshots. The same vertical slice also retains source-specific child state, non-owner-scoped scheduling, inconsistent visible-item counts, and a Skills progress mapping gap, so another local Chat patch would preserve the conditions for future drift.

## What Changes

- **BREAKING** Replace the internal ACP Workspace publication wire with one current-state vocabulary whose transcript count and revision fields have explicit UI-visible scopes; do not decode or dual-write the old fields.
- Rebuild ACP Chat and ACP Skills around one shared Workspace surface adapter/runtime, owner-scoped scheduler, coordinator-owned rebase path, canonical child state, and browser controller.
- Make transcript delta validation and commit transactional across page metadata, item map, item order, revision, DOM effect, and terminal acknowledgement.
- Remove the `resync-required` child round trip, full-panel initialization/steady materialization, source-specific receiver projection, duplicated child publication queues, and baseline-status fallbacks for owner navigation.
- Give Chat and Skills exhaustive paired mappings, including ordinary Skills progress/message-count publication, while retaining their independent domain stores, protocols, persistence, and lifecycles.
- Extend profiler and Replay evidence so valid steady streams prove zero gap/rebase snapshots, complete lifecycle identity, visible transcript, and the existing cross-surface performance budgets.
- Add a long-lived ACP Workspace surface architecture SSOT under `doc/components`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: Define transactional transcript state, explicit visible-count/revision semantics, canonical child regions, and coordinator-owned rebase.
- `assistant-workspace-ui-refresh-governance`: Require one owner-scoped ACP surface runtime and source-neutral child controller for Chat and Skills.
- `acp-chat-performance-ui`: Prohibit valid steady Chat deltas from producing gap, rebase, snapshot, or full-panel work.
- `acp-chat-file-backed-transcript-state`: Keep raw store counts behind the Chat adapter and publish only projected visible counts.
- `acp-skill-run-file-backed-runtime-state`: Keep raw store counts behind the Skills adapter and publish ordinary progress through the shared message-count region.
- `acp-runtime-performance-profiler`: Attribute transactional delta, rebase, materialization, and surface lifecycle metrics consistently.
- `acp-runtime-replay-profiler`: Make no-storm publication behavior and complete Chat/Skills target-active evidence part of formal acceptance.

## Impact

The change replaces the ACP-specific Assistant Workspace host adapters, publication scheduling, child controller, and transcript receiver used by ACP Chat and ACP Skills. It updates the internal publication schema, shared renderer integration, profiler/replay aggregation, existing conformance/UI/runtime tests, and related architecture documentation. Chat conversation storage, Skills run storage, transcript JSONL/index formats, external APIs, user display-mode settings, and SkillRunner remain unchanged.
