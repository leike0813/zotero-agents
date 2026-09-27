# Tasks

## 1. Turn catalog and policy

- [x] 1.1 Add a failing shared test for frozen catalog identity and schema admission; implement the project-owned Gateway DTOs and validated turn snapshot, then pass the focused test.
- [x] 1.2 Add failing tests for system ceiling, current authorization, runtime capability, and fail-closed classification; implement policy preflight and pass the focused tests.

## 2. Batch lifecycle

- [x] 2.1 Add failing tests for whole-batch structure, exclusive/deferred mode, conflict scheduling, cancellation, and ordered results; implement bounded batch execution and pass the focused tests.
- [x] 2.2 Add failing tests for started-before-effect, durable receipt-before-success, unknown outcome, and bounded projection; implement callback/receipt lifecycle and pass the focused tests.
- [x] 2.3 Add failing tests for exact approval, denial, stale binding, and new-turn continuation; implement continuation and pass the focused tests.

## 3. Integration evidence

- [x] 3.1 Admit the shared test to the existing Node shard and real-Zotero lite suite; verify both execute Gateway behavior without a Node runtime in Zotero.
- [x] 3.2 Run lint, build, relevant Node tests, and the real Zotero core gate; record exact results and update the living Pi handoff, including C03 commit state.
- [x] 3.3 Verify implementation against every delta requirement, validate OpenSpec strictly, sync the main spec, and archive the completed change with verification evidence.
