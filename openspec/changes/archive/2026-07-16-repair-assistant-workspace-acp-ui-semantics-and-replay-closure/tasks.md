## 1. Contract and action routing TDD

- [x] 1.1 Add v6 exact-schema, semantic registry, v5 rejection, and source
  exhaustiveness tests.
- [x] 1.2 Add parameterized child-to-Host action tests for drawer/selector
  selection, archive, navigation-group creation, selected-owner actions, and
  invalid payload rejection.
- [x] 1.3 Implement v6 owner presentation producers, receiver validation, exact
  projector, and the shared action-routing registry.

## 2. UI semantics, SSOT, localization, and layout

- [x] 2.1 Add stable behavior tests for usage gauge versus service LED,
  independent Skills status axes, localized visible text/ARIA, and complete
  Chat/Skills drawer cards.
- [x] 2.2 Add DOM identity and layout tests across no-owner, loading, ready, and
  owner-switch states.
- [x] 2.3 Restore early panel semantics through the shared model/renderer,
  derive Skills task state from the workflow-task SSOT, and keep the main grid
  mounted.
- [x] 2.4 Complete Assistant Workspace labels/locales and extend localization
  governance over shared ACP model/child/HTML.

## 3. Renderer and Replay closure

- [x] 3.1 Add a sanitized round6 transcript mutation fixture and failing tests
  for transactional delta application, retry, and bounded renderer diagnostics.
- [x] 3.2 Make virtual transcript state, node maps, signatures, and canonical
  child commits transactional; retain structured ACK failure stage/code and
  render path.
- [x] 3.3 Add profiler/Replay tests for lifecycle diagnostics, both-lane
  preparation drain, source watermark, late stale contamination, and formal
  recovery/rebase rejection.
- [x] 3.4 Implement Replay publication epochs and lifecycle-derived acceptance.

## 4. Documentation and verification

- [x] 4.1 Complete the round7 audit and update current-state publication,
  panel, localization, profiler, Replay, and parity documentation.
- [x] 4.2 Run focused Node/browser/Zotero tests and fix all change-related
  failures.
- [x] 4.3 Run formal Chat/Skills `after-R3-round7` Replay when fixtures and
  hosts are available, then run lint, build, help-doc drift, strict OpenSpec
  validation, and production zero-reference searches.
