## Context

The current workflow contract mixes three different concerns: whether a raw Zotero selection is admissible, how selected/related objects become execution inputs, and how those inputs become independently scheduled jobs. Loader normalization and runtime code both interpret legacy `inputs.unit`, `inputs.per_parent`, `validateSelection.select.unit`, and `validateSelection.derive` fields. The runtime then rebuilds scoped selections while splitting work, so a global requirement such as `parents.min: 2` can be checked again against a one-parent unit and reject every job.

This change is a coordinated breaking migration. Every distributed and test workflow moves together; there is no v1 compatibility reader. Existing provider request/result/hooks/parameters contracts and queue-ownership rules remain stable.

## Goals / Non-Goals

**Goals:**

- Establish one explicit pipeline from raw `SelectionContext` to immutable top-level execution units.
- Give candidate type, grouping, selection validation, filtering, and cardinality one declaration source each.
- Make confirmed planning the only execution SSOT while keeping preview planning availability-safe.
- Preserve deterministic candidate, group, and member order.
- Treat the prepared unit as the concurrency, duplicate-confirmation, preflight, queue, and Host Bridge build boundary.
- Migrate all manifests and current-state documentation atomically.

**Non-Goals:**

- Supporting v1 manifests, silent normalization, or automatic migration.
- Adding fixed-size grouping.
- Changing provider, request, hooks, result, parameters, submit result, or handle contracts.
- Changing which Generic HTTP or pass-through executions enter the Host queue.
- Publishing plugin/content-package versions or dispatching Host Bridge releases.
- Expanding the scope of `add-native-workflow-queue-management`.

## Decisions

### 1. Use an explicit v2 pipeline

`schemaVersion: 2` manifests declare:

1. `trigger.requiresSelection` for the empty-selection fast gate.
2. `validateSelection.require.selection` for a single raw-selection cardinality/mixed check.
3. `validateSelection.select` for ordered atomic candidate production.
4. `inputs.member` for candidate compatibility and attachment MIME acceptance.
5. ordered `validateSelection.filters` for contextual exclusion.
6. `validateSelection.require.candidates` for post-filter cardinality.
7. `inputs.grouping` for top-level execution-unit construction.

This separates the producer contract (`validateSelection`) from the consumer contract (`inputs`). Retaining overlapping legacy fields would preserve ambiguity, so the loader rejects them instead of normalizing them.

### 2. Centralize planning in `workflowInputPlanning.ts`

One module owns requirement validation, selectors, member compatibility, filters, grouping, context merging, and candidate/unit statistics. It replaces `workflowSelectionValidation.ts` and runtime-local MIME, per-parent, and unit splitting.

Selectors return a declared candidate kind. The loader checks the selector/member compatibility matrix before runtime. `input-member` derives its kind from `inputs.member.kind`; `selection`, `literature-source`, `generated-note-candidates`, and `digest-representative-image` have fixed output kinds and structural restrictions.

### 3. Model candidates and prepared units explicitly

An ordered `WorkflowInputCandidate` carries kind, stable identity, label, optional stable parent identity, and a scoped `SelectionContext`. A `PreparedWorkflowUnit` carries ordered members and member identities, member count, merged scoped context, a stable safe label, and an optional shared target parent.

The plan exposes raw selection counts and separate candidate/unit statistics. Objects are readonly and frozen at the planning boundary so downstream admission cannot delete members or regroup work.

### 4. Keep planning phases distinct

Preview planning applies selection requirements, selectors, member compatibility, MIME acceptance, and only filters marked `phase: "availability"`. Confirmed execution planning additionally applies execute-phase rules and becomes the execution SSOT.

Static read-only filters run in both phases. Parameter-dependent `artifact-absent` filters must declare `phase: "execute"` because preview cannot know confirmed parameters.

### 5. Group deterministically

- `each` emits one unit per surviving candidate.
- `all` emits at most one unit containing every surviving candidate.
- `parent` partitions by stable parent identity; group and member order follow first candidate appearance.

Parent-group candidates without stable parent identity are skipped once with `missing-parent` and counted as candidate skips. They are never merged into an anonymous group. Zero final units fails with `NO_VALID_INPUT_UNITS`, even without an explicit candidate lower bound.

### 6. Build and preflight prepared units without replanning

`buildPreparedWorkflowUnitExecution` receives a prepared unit and never invokes selection planning. Preflight runs after grouping and may replace or expand the provider request inside that one top-level unit, but it cannot create a new scheduling unit or Host concurrency slot.

Admission freezes group membership. A stale source discovered later affects only that unit's build/run outcome; it does not trigger global selection validation or regroup peers.

### 7. Make the group the queue and duplicate boundary

Host queue records index every member identity while public snapshots expose only a safe group label and member count. If any member conflicts with an active or queued identity, duplicate protection asks once for the immutable group. Rejection skips the entire group; acceptance is followed by a conflict recheck without changing membership.

Success and failure counts describe top-level execution units. Candidate skips describe inputs removed before grouping; unit skips describe duplicate refusal, queued cancellation, preflight skip, and equivalent unit outcomes.

### 8. Project the same contract to UI and Host Bridge

Settings preview renders one row per prepared unit. Concurrency controls and the left unit list appear only when unit count exceeds one.

Host Bridge list/describe/validate/apply-readiness project `inputs` and `validateSelection` as distinct fields. Zotero-managed submit builds each allowed prepared unit independently, then joins results into the existing single `workflowRunId` batch. It does not reconstruct work from raw selection. Agent-owned handoff/apply boundaries remain unchanged.

### 9. Migrate all manifests and raise content API atomically

All built-in, debug, package, fixture, and inline test manifests gain `schemaVersion: 2`, explicit `trigger.requiresSelection`, v2 member/grouping declarations, tagged selectors, and phased filters. The supported content API becomes `3.0.0`. Generated help files are updated only through their generator.

## Risks / Trade-offs

- [Breaking manifest migration can miss a fixture or debug workflow] → Enumerate every `workflow.json` and inline manifest in schema tests, then run built-in/workflow/UI suites.
- [A broad planner rewrite can subtly reorder jobs] → Make order part of table-driven planner tests for selector, `each`, `all`, and `parent`.
- [Related-item expansion can create duplicate candidates] → Deduplicate by stable candidate identity while retaining first appearance.
- [Queue snapshots could leak selection details] → Store internal member identities separately and expose only label/count publicly.
- [Preview can disagree with confirmed execution after state changes] → Treat preview as advisory and rerun all availability-safe rules during confirmed planning.
- [Content API v3 can invalidate older distributed packages] → Reject them explicitly; do not add fallback normalization.

## Migration Plan

1. Add failing schema/loader and planner contract tests.
2. Add v2 types/schema/loader validation and the centralized planner.
3. Move runtime preparation, duplicate guarding, queueing, settings preview, and Host Bridge to prepared units.
4. Migrate every workflow/fixture/inline manifest and remove legacy reader/runtime code.
5. Update current-state docs, translations, and generated help; set content API `3.0.0`.
6. Run focused and repository-wide verification, including strict validation of this change and the existing queue change.

Rollback before publication is a source rollback of the entire coordinated change. Partial rollback is unsupported because v1 manifests are intentionally unreadable by the v2 loader.

## Open Questions

None. Fixed-size grouping and any future selector/filter kinds require separate protocol changes.
