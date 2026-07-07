## 1. Specification

- [x] 1.1 Add ACP Chat cold page-first and mirror LRU delta spec.
- [x] 1.2 Add ACP Skills cold page-first and mirror LRU delta spec.
- [x] 1.3 Add project-level Assistant transcript cold-load rule.

## 2. Tests

- [x] 2.1 Add ACP Skills cold selected page test that does not wait for full hydrate.
- [x] 2.2 Add ACP Skills 10-slot cold mirror LRU and pinned-live mirror test.
- [x] 2.3 Add ACP Chat cold selected page test that uses store page read when mirror is absent.
- [x] 2.4 Add ACP Chat 10-slot cold mirror LRU and pinned-live mirror test.
- [x] 2.5 Add source-level guards for page-first cold rendering and LRU constants.

## 3. Implementation

- [x] 3.1 Implement ACP Skills page-first cold selected page path.
- [x] 3.2 Implement ACP Skills cold mirror LRU retention.
- [x] 3.3 Implement ACP Chat page-first cold selected page path.
- [x] 3.4 Implement ACP Chat cold mirror LRU retention.

## 4. Validation

- [x] 4.1 Run focused ACP Skills, ACP Chat, and UI smoke validation.
- [x] 4.2 Run full target test files.
- [x] 4.3 Run `openspec validate optimize-assistant-transcript-cold-load-cache --strict`.

## 5. ACP Skills Selection Timing Regression

- [x] 5.1 Add ACP Skills tests for selection-only cold run selection and loading-first snapshot.
- [x] 5.2 Add Assistant Workspace smoke/source guards for two-phase ACP Skills selection and init/tab-switch loading-first snapshots.
- [x] 5.3 Make `selectAcpSkillRun()` selection-only and add loading-first/page-first snapshot modes.
- [x] 5.4 Wire ACP Skills host selection/init/tab-switch to loading-first then queued page-first snapshots.
- [x] 5.5 Run focused/full validation after the timing fix.

## 6. ACP Skills Cold Page Read Performance Follow-up

- [x] 6.1 Update ACP Skills transcript selection/hydration sequence documentation for loading-first and page-first timing.
- [x] 6.2 Batch ACP Skills indexed transcript page range reads to avoid per-event file open/close.
- [x] 6.3 Render shared virtual transcript loading sentinels for unloaded page gaps.
- [x] 6.4 Run focused/full validation after the page read performance follow-up.

## 7. ACP Chat Owner Transition Parity

- [x] 7.1 Add ACP Chat tests for selection-only conversation selection, loading-first snapshots, and page-first hydrate warm-up.
- [x] 7.2 Add Assistant Workspace smoke/source guards for ACP Chat pending owner snapshots and two-phase owner transition posting.
- [x] 7.3 Make ACP Chat backend/conversation selection owner-only and move full hydrate warm-up behind page-first selected page reads.
- [x] 7.4 Wire ACP Chat init/tab-switch, conversation switch, backend switch, and new-conversation paths to loading-first then queued page-first snapshots.
- [x] 7.5 Update OpenSpec, AGENTS, and sequence documentation to express owner transition as a global Assistant Workspace invariant.
