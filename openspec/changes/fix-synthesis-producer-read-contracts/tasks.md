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

The final native stage1 run at source `a106656343c150d0d45e1f7f1e9dd1e79db9787e` passes all 57 test files and the complete coverage aggregate: 483/483 entries, 483/483 cross-language messages, 14781/14781 structure probes and receiver execution obligations, and 10/10 workflow producers. All uncovered and violation lists are empty. Unicode seed lengths and proposal-count limits are verified through the existing production route. Seven-platform prebuild run `39597110060` is synchronized and fresh; the rebuilt XPI passes its seven-target inventory check. See `artifacts/synthesis-producer-contract-repair.md` for exact identities, logs, CI results and acceptance limits. These execution tasks do not authorize archive or formal publication.

## Workflow follow-up

- Three-host verification run `39596896941` passed. The official resolver matched its trusted v2 receipt to the current source/build/verification fingerprints with no diagnostics.
- Archive only after implementation acceptance if requested. Publication, native prebuild dispatch, Git commits and real-library acceptance remain separate operations.
