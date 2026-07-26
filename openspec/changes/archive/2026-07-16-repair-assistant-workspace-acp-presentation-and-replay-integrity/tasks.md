## 1. Contract and root-cause TDD

- [x] 1.1 Add strict v5 registry/schema tests, source support exhaustiveness,
  old-field rejection, owner reset, and pre-build guard tests.
- [x] 1.2 Add parameterized Chat/Skills runtime tests for inactive targets,
  owner mismatch, batch reads, initialization, rebase, and ACK behavior.
- [x] 1.3 Add browser tests for canonical/local-state separation, owner reset,
  task-card identity, targeted region rendering, and retry after render failure.
- [x] 1.4 Add profiler/Replay tests for series cap, rejected/out-of-window ACK,
  first terminal outcome, ledger-derived counts, and explicit acceptance.

## 2. Publication contract and shared runtime

- [x] 2.1 Implement the v5 region registry, exact envelope/ACK/barrier, canonical
  browser state, and remove v4 kinds and aliases.
- [x] 2.2 Introduce `assistantWorkspacePublicationRuntime.ts` with shared guards,
  coalescing, batch reads, initialization, owner cleanup, rebase, and lifecycle.
- [x] 2.3 Migrate Chat and Skills adapters and Sidebar scheduling to the shared
  runtime, including typed backend refresh and display-mode rebase.

## 3. Producer state removal

- [x] 3.1 Remove Chat frontend/panel snapshot publication state and rename its
  Workspace change subscription.
- [x] 3.2 Add the Skills minimal Workspace read model and diagnostics DTO; remove
  ACP panel snapshot builders from Workspace consumers and Task Manager.
- [x] 3.3 Make queued Workspace changes readonly owner-transferred DTOs without
  JSON deep-copy normalization.

## 4. Shared browser child and presentation

- [x] 4.1 Add the shared ACP child JS/CSS, migrate both HTML documents to common
  data-role markup, bridge, message, and action envelopes, and delete
  source-specific child assets.
- [x] 4.2 Replace legacy presentation/projector fallback with one exact
  `projectAssistantWorkspacePanel` path and local-only drawer/display state.
- [x] 4.3 Restore Chat catalog/session semantics, Skills owner/banner semantics,
  shared service indicators, and keyed task-card reconciliation.

## 5. Profiler and Replay

- [x] 5.1 Introduce the post-owned lifecycle ledger, bounded failure codes,
  first-terminal-wins, and cap-independent correctness accounting.
- [x] 5.2 Separate Replay completion from acceptance and remove historical
  matrix/governance compatibility fields and performance-test post helper.
- [x] 5.3 Rename resync vocabulary to rebase/overflow and align sidecar,
  logical-time, and production ports.

## 6. Documentation and verification

- [x] 6.1 Add the round6 legacy-debt audit and update publication, profiler,
  parity, localization, and OpenSpec current-state documentation.
- [x] 6.2 Run focused Node/browser/runtime/profiler/Replay tests and fix all
  change-related failures.
- [x] 6.3 Run lint, build, help-doc drift, strict OpenSpec validation, available
  Zotero 7/9 checks, formal Replay when fixtures/hosts exist, and zero-reference
  searches for removed production vocabulary.
