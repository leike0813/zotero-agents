## 1. Baseline contracts and tests

- [x] 1.1 Add shared domain-change, publication owner, region publication, and acknowledgement types without changing external/store formats
- [x] 1.2 Extend Chat/session and Workspace host tests to lock message-count/transcript routing, early source/owner drops, publication counts/bytes, acknowledgement, and managed-region DOM identity
- [x] 1.3 Correct R3 profiler tests and implementation for lifecycle stages, causality labels, region signature bytes, actual posted bytes, and count/totalMs/maxMs duration summaries
- [x] 1.4 Capture or document the corrected pre-governance live Chat baseline with existing trace provenance before enabling region routing

## 2. Chat change routing and host publications

- [x] 2.1 Split ACP Chat runtime UI changes into baseline/status, message-counts, transcript, plan, permission, reply/hint, and context/details routes
- [x] 2.2 Remove message-count-to-metadata and generalized full-snapshot fallback paths while preserving explicit init/activation baseline publication
- [x] 2.3 Implement source/owner guard before page read or DTO build and independent owner/kind region signature guards before post
- [x] 2.4 Keep baseline/chrome DTO free of selectedTranscriptPage, transcript/loading/streaming/event revisions, and message-count revisions
- [x] 2.5 Preserve owner-first/loading-first/page-first publication, pinned live mirror, and owner-scoped cold LRU behavior

## 3. Shell and child region application

- [x] 3.1 Make the Workspace shell forward typed region publications without merging transcript and chrome state
- [x] 3.2 Apply Chat publications only to their managed DOM regions and reject old-owner or stale-revision updates
- [x] 3.3 Adapt Skills to the shared publication envelope and protect existing live/silent run-panel behavior without unrelated performance refactoring
- [x] 3.4 Add region signature guards for toolbar, banner, plan, hint, reply, context/details/permission drawers, transcript, and Runner pane identity
- [x] 3.5 Emit and capture shell-receive, child-apply, and render-complete acknowledgements with publication identity
- [x] 3.6 Replace silent shell-cache/child snapshot coalescing with explicit superseded terminal state and ordered lifecycle completion for identified Chat and Skills snapshots

## 4. Replay evidence and reporting

- [x] 4.1 Update Replay R3 coverage so missing required host/shell/child/render-ack families mark measurement incomplete
- [x] 4.2 Report matching-target, opposite-active, inactive-source, initialization versus steady-state, region counts, actual bytes, and duration aggregates
- [x] 4.3 Compare corrected before/after live Chat evidence only under identical provenance and label logical cadence timing synthetic
- [x] 4.4 Update the R3 audit artifact with corrected evidence, non-silent replay terminology, and remaining R1/R2 risks
- [x] 4.5 Make replay drain host-ack-aware and validate R3 lifecycle sets by publication identity without high-cardinality metric series

## 5. Verification

- [x] 5.1 Run the focused Node/Zotero session, UI smoke, performance profiler, and replay profiler tests
- [x] 5.2 Run `npm run lint:check`, `npm run build`, and strict OpenSpec validation
- [ ] 5.3 Generate the same-provenance corrected after live Chat matrix and verify baseline count/posted bytes decrease without drift-bucket regression where real Zotero hosts are available
- [x] 5.4 Record unavailable Zotero 7/9 formal host runs explicitly without claiming real-host latency improvement
- [x] 5.5 Run focused regression coverage for delayed acknowledgements, cross-round attribution, and same-frame Skills snapshots
