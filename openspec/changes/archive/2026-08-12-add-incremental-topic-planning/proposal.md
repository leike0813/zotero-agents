## Why

Topic synthesis currently discovers and persists topic relations only while materializing one topic, which forces create runs to be serialized and gives users no library-wide guidance about how to partition their literature. A library-level incremental planner can establish lightweight topic structure first, so content synthesis can run independently and in parallel.

## What Changes

- Add an incremental Topic Planner workflow that reads the current library, existing topics, graph state, and coverage before deciding whether to create, revise, stale, reactivate, or leave planned topics unchanged.
- Add Planned Topic lifecycle metadata on existing Topic Graph placeholder nodes, without introducing a second topic entity or persisting provisional paper memberships.
- Add one atomic, compare-and-swap `topic_plan/reconcile` apply contract for planned-topic actions and relation proposals.
- Add a bulk planning-context capability and `synthesis topic get-planning-context` CLI command, including bounded output-path/download behavior.
- Let Create Topic Synthesis either consume a Planned Topic or accept an ad-hoc seed. Materializing a Planned Topic re-runs its resolver and promotes the same graph node.
- Resolve an ad-hoc topic seed against active Planned Topics before creating a new identity, and automatically materialize the best same-topic match when one exists.
- Preserve relation decisions while reconciling planner- and synthesis-produced proposals by canonical relation tuple and provenance.
- Allow Update Topic Synthesis to proceed when stable artifact, score, or dependency changes exist even when no papers were added.

## Capabilities

### New Capabilities

- `topic-planning-workflow`: Incremental library-wide planning, coverage semantics, planned-topic lifecycle, and atomic plan reconciliation.

### Modified Capabilities

- `synthesis-topic-graph`: Placeholder nodes carry Planned Topic metadata and relation proposal provenance while preserving materialized-topic and review-decision invariants.
- `topic-synthesis-workflows`: Create supports planned and ad-hoc entry modes, and update eligibility includes non-membership changes.
- `host-bridge-cli-synthesis-subcommands`: The CLI exposes a bounded planning-context export command.
- `host-bridge-agent-surfaces`: Agent-facing command catalogs describe the new read and reconciliation flow without weakening existing instructions.

## Impact

The change affects the synthesis SQLite repository, topic graph/service contracts, workflow parameter validation, built-in workflow packages, generated topic-synthesis skills, a new planner skill, Host Bridge capabilities and Rust CLI contracts, localized workflow labels, OpenSpec documentation, and focused core/CLI tests. It adds no dependency and performs no release action.
