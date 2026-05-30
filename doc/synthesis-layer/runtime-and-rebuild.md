# Runtime and Rebuild

Synthesis runs inside a single Zotero plugin process on a single JavaScript event loop. The design should use local async coordination, short SQLite transactions, and startup cleanup. It should not imitate distributed queue systems.

## Runtime Model

- Workers are cooperative async tasks in one process.
- SQLite transactions provide atomic visibility for writes.
- UI reads committed snapshots; it may observe state before or after a transaction, but never half a transaction.
- Long work is split into batches with progress rows and resumable dirty events.
- In-progress markers are cleaned on startup or explicit maintenance.
- User actions that imply cascades should commit the core decision first, then enqueue bounded maintenance work.

Do not use distributed queue, audit-log, or lock-order protocols unless the runtime model changes.

## Events

Events are operational work records, not an immutable audit ledger.

- Source events come from Zotero/artifact changes, user actions, or explicit rebuild/reset commands.
- Dirty events represent bounded recomputation work.
- Progress events update user-visible job state.
- Review items are user-facing decisions, not queue infrastructure.

Stable IDs live in [states-and-events.yaml](./contracts/states-and-events.yaml).

### Event Routing Policy

Synthesis uses a thin routing policy, not a global impact planner. The policy converts a source change into bounded dirty events, review items, job recommendations, diagnostics, and supersede/clear commands. It must not own domain facts or perform matching itself.

Target interface:

```ts
type SynthesisRoutingInput =
  | { kind: "paper_added"; paperRef: string; literatureItemId: string }
  | { kind: "paper_artifact_changed"; paperRef: string; artifactTypes: string[] }
  | { kind: "paper_deleted"; paperRef: string; literatureItemId: string }
  | { kind: "paper_merged"; fromLiteratureItemId: string; toLiteratureItemId: string }
  | { kind: "external_literature_dedupe_candidate"; leftLiteratureItemId: string; rightLiteratureItemId: string }
  | { kind: "literature_redirect_materialized"; fromLiteratureItemId: string; toLiteratureItemId: string }
  | { kind: "digest_applied"; paperRef: string; literatureItemId: string }
  | { kind: "topic_source_check_requested"; topicId: string }
  | { kind: "external_source_drift_detected"; severity: "small" | "bulk" | "structural"; libraryId: number }
  | { kind: "registry_cache_rebuilt"; registryEpoch: string }
  | { kind: "citation_graph_changed"; graphHash: string }
  | { kind: "zotero_related_items_sync_requested"; sourceLiteratureItemIds?: string[]; graphEpoch?: string }
  | { kind: "zotero_related_items_sync_echo"; sourceLiteratureItemIds: string[]; operationId: string }
  | { kind: "topic_interest_metadata_changed"; topicId: string }
  | { kind: "literature_matching_metadata_changed"; literatureItemId: string };

type SynthesisRoutingResult = {
  dirtyEvents: DirtyEventDraft[];
  reviewItems: ReviewItemDraft[];
  jobRecommendations: JobRecommendation[];
  diagnostics: Diagnostic[];
  supersedeOrClear?: SupersedeCommand[];
};
```

Routing output must not contain semantic matcher results, graph nodes/edges/layout, file scan rows, topic source-check decisions from Registry changes, direct cross-domain writes, or unbounded fan-out.

Core rules:

| Change | Must Affect | Must Not Directly Affect |
| --- | --- | --- |
| paper added, no digest | Registry Cache | topic source check, discovery candidates |
| digest applied with matching metadata | Registry artifact state; one-literature apply-time discovery | topic artifact text; all-library discovery scan |
| paper artifact changed | Registry Cache; Citation Graph dirty slice | topic source-check changed diagnostic |
| paper deleted | binding/delete review; affected graph slice | silent topic dependency deletion |
| paper merged | redirect/binding state; reference retarget | topic resolver rewrite without explicit decision |
| external dedupe candidate | strong identifier auto redirect or bounded review | fuzzy auto merge |
| literature redirect materialized | retarget affected resolutions/edges; related-items sync dirty | delete original review evidence |
| registry full rebuild | advance `registry_epoch`; supersede old registry/graph/discovery-repair queue; graph rebuild | topic source-check/freshness; discovery full backscan |
| graph structure changed | metrics/layout dirty; related-items sync dirty | Registry facts; topic source-check state |
| reference resolution review action | affected graph slice; related-items sync for matched library edge | legacy reference-matching workflow path |
| related-items sync echo | sync diagnostics only when matched to a durable sync effect/attempt | Registry reindex / graph rebuild / another related-items sync based only on recent in-memory markers |
| topic source check requested | source manifest diagnostic | topic artifact rewrite |
| external source small drift | bounded Registry dirty events | full rebuild fan-out |
| external source bulk drift | bounded drift incident and rebuild recommendation | per-item dirty/review/graph fan-out |
| external source structural drift | diagnostic/repair required; pause incremental fan-out | treating source as trusted |
| topic interest metadata changed | future digest apply matching | coverage/freshness; old literature backscan |
| literature matching metadata changed | digest apply-time discovery input | literature-to-literature reference matching |

## Review Action Transactions

Review actions must keep the UI responsive. A review action transaction should include only the core facts required to make the decision durable:

- the resolved/rejected review row;
- direct domain fact changes such as a binding, redirect, tombstone, or accepted reference resolution;
- minimal diagnostics needed to explain the decision;
- dirty events for downstream recomputation.

Expensive cascade work must be processed after commit in bounded worker batches. Examples include refreshing dependent review rows, rebuilding graph structure, recomputing summaries, syncing Zotero related items, and updating broad diagnostics.

A failed cascade must not roll back the already accepted user decision. It should leave retryable dirty events or diagnostics.

## Queue Semantics

Dirty events should be repository-backed and scope-aware:

- Registry work handles changed Zotero items and source artifacts.
- Graph work handles reference resolution, graph structure, metrics, layout, and related-items sync.
- Topic work handles explicit source checks and discovery review surfaces.
- Reset/rebuild operations may clear or supersede queued work whose basis is no longer meaningful.

When a worker crashes because Zotero exits, startup cleanup marks old in-progress rows as retryable or cleared according to operation type.

## External Source Drift

Startup reconcile is a bounded detector, not an unbounded impact executor. It classifies Zotero Library and artifact-note drift before enqueueing work:

| Severity | Threshold | Action |
| --- | --- | --- |
| `small` | changed items <= 50 and <= 5% active library; decode failure ratio < 2%; fingerprint scan within budget | Emit bounded Registry dirty events. |
| `bulk` | changed items > 50 or > 5%; suspicious bulk merge/delete/update; scan over soft budget without structural anomaly | Record bounded incident and recommend explicit Registry/Graph rebuild; fan-out forbidden. |
| `structural` | binding collision, impossible parent note structure, decode failure ratio >= 2%, hard fingerprint timeout, inconsistent Zotero API/DB result | Fail closed and require inspect/repair/reset/rebuild; fan-out forbidden. |

Bulk and structural drift must create a bounded drift incident with counts, examples, severity, and recommended inspect/rebuild commands. They must not expand into thousands of per-item dirty events, graph jobs, review cards, or topic source-check/discovery work.

Structural drift should fail closed: pause incremental Registry fan-out until the user runs explicit inspect, repair, reset, or rebuild action.

## Rebuild Semantics

Registry rebuild is foundational and should be guarded:

- It needs explicit confirmation in UI/CLI.
- It clears or supersedes pending Registry/Graph work from the old basis.
- It advances `registry_epoch` only after a staged rebuild passes validation and is atomically promoted.
- It reports real progress using item counts when available.
- It should trigger graph rebuild because graph facts depend on Registry facts.

Registry rebuild uses staged promotion:

1. Create a rebuild run with a candidate epoch and write rebuilt Registry facts into staging state or rows marked by run ID.
2. Validate identity resolution, required table counts, reference-resolution integrity, and bounded diagnostics before promotion.
3. Promote the candidate epoch in one short transaction that swaps the active Registry basis.
4. Keep the previous active epoch as the last-known-good basis until the new epoch is accepted.

If rebuild fails before promotion, the active `registry_epoch` does not change and the Workbench continues reading the previous committed Registry. If a promoted epoch is later found bad, an explicit rollback action may repoint active Registry state to the last-known-good epoch and enqueue Graph rebuild on that basis.

Graph rebuild records `graph_basis_registry_epoch`. If Registry advances while Graph work is queued or running, stale graph work may finish computation but its final promotion must be rejected by the repository commit gate and retried on the new basis.

Topic artifacts are independent from Registry epoch. Registry rebuild should not mark complete/fresh topics changed by itself.

### Derived Work Commit Gate

Running workers cannot be physically preempted in the single-process JavaScript runtime. Epoch/basis guards are therefore commit gates, not cancellation guarantees.

All derived workers that replace visible Registry-dependent state, including graph structure, metrics, layout, and related read models, must follow a staged commit pattern:

1. Read the current basis at worker start and store it on the dirty event/job/run, for example `graph_basis_registry_epoch`.
2. Write intermediate output into staging rows or rows scoped by `run_id` and basis. Normal Workbench reads must not read these rows.
3. At final promotion, open one short repository transaction.
4. Inside that transaction, reread the current active basis.
5. If the active basis differs from the worker basis, mark the event/job/run `superseded`, leave active pointers unchanged, and do not expose staged rows.
6. If the basis still matches, promote the staged output by swapping the active pointer or otherwise atomically marking that run as active.

Workers may still finish computation after their basis becomes stale. The safety requirement is that stale results cannot become visible or overwrite newer committed rows. A pre-commit basis check outside the final write transaction is only advisory and is not sufficient.

### Registry Candidate Validation Gate

Validation is a safety gate before promotion, not a best-effort warning. It runs against the candidate epoch and previous active epoch, producing a bounded report with pass/fail/suspicious status.

Required checks:

| Check | Failure Condition |
| --- | --- |
| Schema and required tables | Missing `synt_*` table family, schema meta mismatch, or migration error. |
| Identity anchor resolution | Candidate rows do not apply accepted redirects first, fail to converge unique non-conflicting strong identifiers across Zotero-bound and external records, or allocate binding-fallback/provisional IDs before checking existing compatible identities. |
| Binding uniqueness | Duplicate active `(library_id, item_key)` binding or active binding pointing to conflicting literature IDs. |
| Redirect/tombstone integrity | Redirect cycle, redirect target missing, tombstone resurrected without explicit restore, or survivor unavailable. |
| Observed-source accounting | Candidate Zotero-bound count differs from observed active Zotero/artifact scan without explicit skipped/unsupported/deleted counters explaining the delta. |
| Suspicious count delta | Candidate count drops or rises by more than 50% from previous active epoch without matching external drift classification. |
| Reference integrity | Reference instances point to missing source literature rows, matched resolutions point to missing/tombstoned targets, or ambiguous results materialize graph edges. |
| Durable effects | Active overrides are either preserved, marked `needs_attention`, or explicitly out of scope; silent drop is failure. |
| Bounded diagnostics | Validation output is bounded, includes examples, and marks truncation when limits are hit. |

Empty candidate Registry is valid only when the observed active Zotero-bound source set is empty or the user requested clean reset/import semantics. Otherwise it is a hard failure.

Validation budget:

- normal path soft target: 3000 ms;
- hard budget: 30000 ms or the active debug/user-configured validation budget;
- long validation must batch and report progress; timeout before promotion is `failed_retryable` and keeps the previous active epoch.

Suspicious but structurally valid candidates must not auto-promote. The UI/CLI may offer an advanced `promote suspicious candidate` action only after showing count deltas, examples, lost/added categories, and the last-known-good rollback option. This action requires dangerous-operation confirmation. It is not the default path.

If validation is valid but wrong because the validation logic has a bug, protection comes from staged promotion plus last-known-good rollback:

- keep previous active epoch until promotion;
- keep last-known-good after promotion;
- expose rebuild report and count deltas in Workbench/debug;
- allow explicit rollback to last-known-good and requeue graph rebuild on that basis.

### Rebuild Operation Matrix

| Operation | Trigger | Confirmation | Old Work Handling | Epoch / Basis | Downstream Impact | Progress |
| --- | --- | --- | --- | --- | --- | --- |
| Paper incremental update | source dirty event | no | consume same-scope event | registry epoch unchanged | graph scoped dirty | item count |
| Full Registry/Graph rebuild | explicit command | yes | clear/supersede old registry/graph/discovery-repair work | advance `registry_epoch`; old graph basis becomes stale | full graph rebuild; no topic work; no discovery full backscan | item count + phases |
| External source drift rebuild | bulk/structural incident -> explicit command | yes | do not expand drift incident per item; clear related registry/graph queue | advance `registry_epoch` after promotion | full graph rebuild; old committed state readable until promotion | item count + phases |
| Citation graph structure rebuild | graph dirty or explicit | usually no | clear stale graph structure/layout jobs | new graph basis bound to current `registry_epoch` | metrics/layout dirty; no topic source check | node/edge/reference count |
| Complex metrics rebuild | graph changed or explicit | no | clear old metrics jobs | graph epoch scoped | metrics rows | fixed phase/time |
| Layout rebuild | Graph UI or explicit | no | clear same-preset stale layout job | layout key scoped | layout state only | node count or phase |
| Topic source check | explicit user/debug/maintenance request | no | clear same-topic source-check job | topic state scoped | source manifest diagnostic only | saved source count |
| Topic discovery apply-time match | literature-digest apply | no | merge same-literature unfinished match | literature scope | bounded hints for that literature | active topic count |
| Topic discovery repair | explicit debug/maintenance | no | clear same bounded repair job | repair run scoped | bounded hint repair | bounded topic-literature pairs |
| Topic artifact update | workflow apply | workflow confirmation | supersede old topic apply conflicts | topic artifact version/hash | topic graph/concept proposals/source baseline | workflow progress |
| Synthesis DB reset | prefs/debug protected action | double confirmation | clear synthesis queue/job | reset epoch | empty runtime state | table counts |
| Clean-install reset | debug protected action | exact phrase | clear runtime/file residue | reset epoch | empty synthesis state | table counts |
| Checkpoint export | explicit command | optional | no queue effect | none | file output | file count |
| JSON import | explicit dry-run/apply | apply confirmation | import scope events | import run id | DB facts | row/file count |

## Failure Recovery

Use simple local recovery:

- A failed short transaction rolls back.
- A failed batch keeps completed prior transactions and marks remaining work retryable.
- A failed after-commit side effect writes diagnostics and can be retried.
- A failed staged Registry rebuild leaves the previous epoch active.
- A bad promoted Registry epoch requires explicit rollback to last-known-good; Graph workers then rebuild from the restored basis.
- Startup cleanup handles interrupted in-progress markers.
- Database corruption recovery is covered in [Persistence and Files](./persistence-and-files.md).

## Dangerous Operations

Dangerous operations need UI confirmation and exact confirmation text:

- Registry full rebuild.
- Registry rollback to a previous epoch.
- Synthesis database reset.
- Clean-install reset.
- Queue clear.
- Import that overwrites current state.

Dry-run should be available for debug-only destructive maintenance where practical.
