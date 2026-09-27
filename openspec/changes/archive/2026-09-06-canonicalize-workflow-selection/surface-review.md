# Selection surface semantic review

Fixed baseline: `4e1cb8ace4aaf0dbd4c3ccf677365cf1ac90ad46`; cumulative baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. Before-edit metrics are in `surface-baseline.json`. Composition is resolved from `host-bridge/surfaces.json`.

## Semantic mapping

| Baseline unit | Current owner | Disposition |
| --- | --- | --- |
| CLI current context and selected-item discovery | capabilities/CLI command contracts and generated context command cards | Current view exposes tree sources; selected items expose exact pages. Only DEL-01/02/05 selection projection and repagination are replaced. |
| CLI workflow explicit input and validation | CLI workflow schemas and minimum-core SKILL Translate common request shapes | Complete portable refs replace legacy input aliases under DEL-06; options, profile, approval, output and recovery obligations remain. |
| Selection pagination completion and failure | Minimum-core SKILL Translate common request shapes | Explicit end-of-pages and basis mismatch handling added. Exact order and child identity are preserved. |
| Generic deictic query and task routing | Query SKILL and research-task-model | Existing exact-object guidance remains valid; parent derivation remains task-specific. No source edit required. |
| Generic workflow candidate/filter/grouping policy | Coordinator, task Skills and generated workflow catalog | Input Planning v2 retained. Runtime discovery stays authoritative; catalog is generated from all eligible manifests. |
| Hermes workflow validation failure | Librarian SKILL Failure handling | DEL-06 replaces silent live-context reacquisition with explicit corrected scope; original refs, queue handles and uncertain-unit reconciliation are retained. |
| Hermes worked invocation scope | automation-policy reference workflow procedure | DEL-06 replaces UI reselection with operator-corrected refs forming a new reviewed invocation. Submission, concurrency, provider, approval and monitoring steps stay in place. |
| Notification, watched runs, attention, catalog, maintenance, receipts and cron | Existing minimum/Generic/Hermes owners | No deletion, reorder, compression or semantic change. |

The only removed meanings are legacy snapshot/repagination, incomplete identity aliases and implicit live-selection replacement named in the approved deletion inventory. Command schemas remain minimum-core facts; research decisions remain Generic; resident operation policy remains Hermes. References retain scenario detail and the SKILL retains execution constraints.

## Review result before source render

- semantic review ran: yes; collector reviewRequired: true.
- minimum-core, Generic, Hermes and Agent Control Contract: aligned after the source edits above.
- unmapped: 0; downgraded: 0; unauthorized dropped: 0; intra-package duplicate: 0 for the reviewed semantic delta and preservation inventory.
- Exact duplicate/structure/depth gate on temporary materialization: passed. Existing short command-card advisories are accepted: each card contains the complete command contract and directly linked discovery context; padding them would duplicate normative instructions. No hard depth failure was accepted.
- Relative baseline gate: passed for every manifest-owned Skill package against both fixed baselines after official in-repository source render. The initial temporary-output comparison could not resolve Git; it was rerun with the official roots and no gate was bypassed.
- Release identity: unchanged; source render belongs to this implementation, release preparation and publication belong to the five-change closeout.

Official source render, content/consumer/doc checks and Chinese mirror finalize/check passed. Mirror inventory: 152 owned files; minimum-core owned/effective 133/133, Generic 13/146, Hermes 6/152. Source commit remains the implementation baseline. Candidate `hbrs-55709ae0da988b79dc46f144` and latest complete `hbrs-8c6de08010d459a0e87e74f2` are unchanged release metadata, not evidence that this implementation was published.

## Selection closure audit

Audit scope: `src/**/*.ts` production selection, workflow planning/execution, Host Bridge and MCP paths, plus `workflows_builtin/**/*.{mjs,json}`. Test-only builders and the unrelated task-dashboard `targetParentID` projection are outside the selection contract audit.

| Closure counter | Count | Evidence and allowed boundary |
| --- | ---: | --- |
| Unmigrated selection consumers | 0 | UI acquisition routes through `readSelectionContext`; explicit remote/durable refs route through `buildSelectionContext`. The remaining callers are `workflowMenu`, `workflowExecute`, `assistantWorkspaceActionRouter`, `selectionSample`, `workflowInputPlanning` and `hostBridgeWorkflowControl`. |
| Legacy selection producers | 0 | `sourceSelection.mjs` is absent, and the audited selection/request paths contain no `sourceAttachmentPaths`, selection-id snapshots or rich selection serializer. `referencesNote.mjs` retains only note and payload parsing. |
| Duplicate Host acquisition | 0 | No preparation/runtime path reacquires the UI selection. Attachment reads in named task selectors and final file descriptor reads are the declared policy/materialization boundaries. |
| Unauthorized promotion/dedupe | 0 | Broker and `SelectionContext` preserve ordered facts. Promotion/deduplication occurs only in named task candidate selection (`dedupeCandidates`) or unrelated result/output handling. |

The four closure counters are zero against the fixed implementation baseline. Any future semantic source edit requires rerunning this mapping and the governed surface review.
