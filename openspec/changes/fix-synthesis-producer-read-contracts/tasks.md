# Tasks

## 1. Shared Topic contracts and write/read continuity

- [x] 1.1 Add nonempty production-route regression cases for proposals, summary, rich coverage and triage; verify baseline failures.
- [x] 1.2 Align contract-set and TS/Rust DTOs with production shapes, and materialize shared Skill definitions; verify strict positive/negative contract tests.
- [x] 1.3 Persist prospective metadata with full/patch semantics and validate projection inputs before promotion; verify apply/reopen/list/context/default-review/Reader tests.
- [x] 1.4 Preserve historical Concept values and expose review diagnostics without automatic confidence conversion; verify historical-read and new-output rejection scenarios.
- [x] 1.5 Update Topic/Concept ownership documentation and remove the unused stdout envelope plus references; verify remaining schema references and renderer tests.

## 2. Formal Python runtime validation

- [x] 2.1 Replace Topic structural interpreter with formal Schema validation while retaining domain checks; verify runtime union/type rejection and existing stage tests.
- [x] 2.2 Replace Deep Reading duplicate structural checks and pre-validation coercion; verify context/final-review rejection and existing runtime tests.
- [x] 2.3 Declare jsonschema runtime dependencies and regenerate Skill packages; verify runner manifests and generated-output checks.

## 3. Isolated generation and delivery checks

- [x] 3.1 Support isolated Deep Reading graph/package outputs; verify temporary rendering leaves source templates unchanged.
- [x] 3.2 Add the reusable builtin-Skill check and wire build/content/shared CI gates; verify stale/missing/extra-file failures and existing gate tests.
- [x] 3.3 Update preflight/release instructions and the project contract constraint; verify documented entry points match code.

## 4. Integration acceptance

- [x] 4.1 Exercise a real Python-produced synthetic artifact through workflow materialization, native apply/reopen and public consumers; preserve evidence in the existing native-stage1 path.
- [x] 4.2 Run targeted type/runtime/producer/renderer checks, Host Bridge generated-content checks and the complete native stage1 evidence chain; record actual uncovered or failed checks.
- [x] 4.3 Validate OpenSpec artifacts and inspect the final diff for unapproved changes, data loss and generated drift; provide an uncommitted implementation report.

Execution and reporting are complete; release acceptance is not. Native stage1's 57 test files pass, but the final coverage gate remains incomplete (314 structural probes and 228 receiver execution obligations uncovered). See `artifacts/synthesis-producer-contract-repair.md` for the exact dimensions, logs and the corrected build/evidence ordering. No gate requirement was relaxed. Do not archive or publish on the basis of these checked execution tasks.

## Workflow follow-up

- Archive only after implementation acceptance if requested. Publication, native prebuild dispatch, Git commits and real-library acceptance remain separate operations.
