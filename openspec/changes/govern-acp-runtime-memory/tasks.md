## Tasks

- [x] Revise OpenSpec artifacts for v3 asynchronous transcript paging and no legacy payload migration.
- [x] Replace ACP Skill run record transcript/output revision arrays with metadata-only state.
- [x] Replace transcript snapshot writes with append-only JSONL events and indexed page reads.
- [x] Add ACP Skills sidebar bridge support for `load-transcript-page` and `acp-skill-run:transcript-page`.
- [x] Update tests for metadata-only snapshots, async page loading, JSONL paging, and regression coverage.
- [x] Back up and reset local test ACP Skill run database/runtime state.
- [x] Run targeted validation and OpenSpec strict validation.
- [x] Review fix: remove `pendingInteraction.candidateText` from long-lived records, snapshots, and persisted payloads.
- [x] Review fix: make run context writes dirty-only and output revision writes append-only.
- [x] Review fix: store bounded transcript preview in the rebuildable index instead of rereading JSONL on append.
- [x] Review fix: capture assistant turn text in runtime files instead of accumulating controller strings.
- [x] Review fix: include `runtimeDir` in expired ACP Skill run retention cleanup.
- [x] Review fix: update focused regression tests and validation.
