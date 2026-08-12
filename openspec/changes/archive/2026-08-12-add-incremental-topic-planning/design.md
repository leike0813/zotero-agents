## Context

See `proposal.md` for motivation. Today, materialized topics and relation proposals are created inside topic-synthesis runs. Topic Graph placeholders exist, but they lack the durable definition needed to act as user-visible Planned Topics. The graph itself is transactionally replaced in SQLite, while the normal library index and topic artifacts remain separate read models.

This change also touches governed Host Bridge agent-facing surfaces. The fixed baseline is commit `23dc0857aed77e4c242c2a0a9f3a5518064e9d22`. The explicit deletion inventory is empty: no existing semantic instruction is authorized for removal, compression, merger, reordering, or downgrade.

## Goals / Non-Goals

**Goals:**

- Make library-wide topic structure explicit before content synthesis.
- Preserve a single topic identity from planning through materialization.
- Permit independent create runs after a single structural planning transaction.
- Keep coverage explainable without making planned paper membership authoritative.
- Add one bulk read boundary and one atomic apply boundary.

**Non-Goals:**

- Automatically materialize topic prose during planning.
- Let the planner rewrite materialized topic definitions or artifacts.
- Persist provisional paper memberships as a new source of truth.
- Guarantee that concurrent ad-hoc creates discover each other before a later planning pass.
- Add a separate fill workflow or a new topic entity.

## Decisions

### Reuse Topic Graph placeholders

`node_type=placeholder` remains the storage representation. A `planning_json` payload stores the Planned Topic contract: lifecycle, title/definition aliases, include/exclude scope, resolver, revision, evidence basis, and provenance. Materialization promotes the same node and retains the planning payload for audit and future resolver reuse.

Alternative considered: add a Planned Topic table. Rejected because it creates identity synchronization and duplicate lifecycle logic.

### Compute coverage from resolvers, never provisional membership

The planning context contains the full top-level regular-item metadata index. Deterministic resolver evaluation produces coverage states. Digest reads are a staged evidence optimization performed only for ambiguous or uncovered batches; their conclusions update the definition/basis, not a durable list of planned members.

Alternative considered: store candidate paper IDs on each skeleton. Rejected because they immediately become stale and compete with materialized membership.

### Apply one graph transaction with graph CAS

`topic_plan/reconcile` carries `base_graph_hash`, `library_index_hash`, topic actions, relation proposals, coverage-manifest path, and update recommendations. Graph hash mismatch rejects the batch. Library hash mismatch does not corrupt graph structure, so the batch may commit with `coverage_stale=true`. A plan fingerprint makes replay return `already_applied`.

Topic actions can create, update, mark stale, or reactivate placeholder nodes. They cannot mutate materialized definitions or artifacts. All validation precedes `replaceTopicGraphState`, preserving all-or-nothing behavior.

### Reconcile relations by canonical tuple and provenance

Planner and topic synthesis are independent proposal producers. Their output is merged by `(source_topic_id, relation_type, target_topic_id)` after direction normalization. Existing accept/reject state always wins. New evidence and producer provenance can accumulate on an unreviewed or reviewed tuple without creating duplicates.

### Keep Create as the only materialization workflow

The Create workflow gains explicit conditional parameters: `usePlannedTopic`, `plannedTopicId`, and `topicSeed`. The prepare stage converts either entry mode into one synthesis context. Planned mode loads the skeleton and runs its resolver against the current index. No Fill workflow is added.

An ad-hoc seed is still resolved against the complete topic inventory before a new identity is created. Stage 10 turns the seed into a bounded topic definition, then selects one of three target decisions: cancel for an existing materialized identity, materialize the best active Planned Topic representing the same topic identity, or create a new topic when neither exists. Related, broader, and narrower topics are not interchangeable matches. When several active Planned Topics satisfy the same-identity test, the agent selects the best definition/scope match, using aliases and title as secondary evidence.

Explicit Planned Topic selection and seed-based selection share one runtime materialization function. The function re-reads semantic context immediately before resolver execution. If the selected placeholder is no longer active or complete, the run cancels and asks for a retry instead of falling back to ad-hoc creation.

The settings-domain required-field check becomes visibility-aware so hidden conditional parameters cannot block submission. This is a generic contract fix rather than workflow-specific UI branching.

### Keep planner orchestration in one staged Skill

One `topic-planner` Skill owns snapshot inspection, metadata coverage, selective evidence escalation, plan validation, and apply. Deterministic scripts handle coverage state normalization, batching, and result-schema validation. The Skill remains current-state only and keeps execution-critical contracts in `SKILL.md`.

### Add a bulk Host Bridge read capability

`topics.get_planning_context` prevents per-topic and per-paper N+1 calls. The Rust command follows existing synthesis topic routing. Inline output remains bounded; `--output-path` and the existing downloadable-product flow carry complete snapshots when needed.

## Risks / Trade-offs

- [Library changes after planning] → Preserve the structural batch but flag coverage stale, prompting the next incremental run.
- [Over-broad resolver definitions] → Report overlap separately, retain `indeterminate`, and require evidence basis in each planned revision.
- [Concurrent planner runs] → Strict graph CAS permits only one batch; the loser re-reads context and replans.
- [Parallel ad-hoc create relation gap] → Accept the temporary gap and let the next planner pass repair it.
- [Planned Topic changes after seed matching] → Re-read canonical semantic context and cancel the run when the selected Planned Topic is no longer active; never create a replacement from the stale decision.
- [SQLite migration leaves old rows without planning payload] → Use a non-null empty JSON default and normalize absent payloads as no plan.
- [Agent-facing documentation accidentally thins] → Use the fixed baseline, empty deletion inventory, official renderers, thickness metrics, and semantic parity gates.

## Migration Plan

1. Add the nullable-by-semantics/non-null-by-storage `planning_json` column with an empty-object default.
2. Deploy readers that tolerate old rows and expose lifecycle only when planning metadata is valid.
3. Add planning-context and reconcile contracts, then the planner workflow and create dual-entry path.
4. Render governed Host Bridge surfaces from their semantic sources.
5. Validate against the fixed baseline. Rollback can stop exposing the workflow while leaving inert planning JSON on placeholder rows; no destructive data migration is required.
