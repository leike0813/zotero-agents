## 1. Contracts and regression tests

- [x] 1.1 Add focused tests for Planned Topic persistence, lifecycle projection, atomic CAS, idempotency, library-drift warnings, and relation decision preservation.
- [x] 1.2 Add focused tests for visibility-aware required workflow parameters and Create dual-entry settings.
- [x] 1.3 Add Host Bridge capability and Rust CLI contract tests for `synthesis topic get-planning-context`.

## 2. Topic planning domain

- [x] 2.1 Extend Topic Graph and SQLite records with normalized Planned Topic metadata while preserving existing placeholder behavior.
- [x] 2.2 Implement bulk planning-context generation, coverage inputs, public lifecycle projection, and active-planned workflow options.
- [x] 2.3 Implement validated atomic `topic_plan/reconcile` apply with graph CAS, library-drift reporting, replay detection, and relation provenance reconciliation.

## 3. Host Bridge

- [x] 3.1 Register `topics.get_planning_context` and route the Rust `synthesis topic get-planning-context` command with output-path/download behavior.
- [x] 3.2 Update semantic sources for the minimum-core CLI and research-task surfaces without deleting or thinning existing instructions.

## 4. Workflows and skills

- [x] 4.1 Create the staged `topic-planner` Skill with deterministic coverage/batching/schema scripts and validate the package.
- [x] 4.2 Add the Topic Planner workflow and package/manifest/localization entries.
- [x] 4.3 Update Create Topic Synthesis to support Planned Topic and ad-hoc modes through a shared prepare context, retaining synthesis relation proposals.
- [x] 4.4 Broaden Update Topic Synthesis eligibility beyond newly added papers and refresh generated topic-synthesis skills.

## 5. Documentation and verification

- [x] 5.1 Update current-state architecture/user documentation and correct identified topic-graph/workflow documentation drift.
- [x] 5.2 Run focused unit, integration, schema, Rust CLI, type, and Skill validation checks.
- [x] 5.3 Run official Host Bridge renderers and fixed-baseline semantic/thickness/parity gates; confirm all four review issue counts are zero.

## 6. Ad-hoc seed Planned Topic preference

- [x] 6.1 Add focused runtime and schema regression tests for seed-based Planned Topic selection, multiple candidates, create-new fallback, materialized duplicates, and state races.
- [x] 6.2 Replace Stage 10 duplicate output with a target-decision contract and share Planned Topic materialization between explicit and seed-selected paths.
- [x] 6.3 Update current-state workflow guidance, render generated topic-synthesis skills, and run focused validation.
