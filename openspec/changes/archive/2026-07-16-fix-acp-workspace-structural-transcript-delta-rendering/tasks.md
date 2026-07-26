## 1. Contract-first regression tests

- [x] 1.1 Extend the parameterized browser receiver conformance suite with bounded tail-page advancement, atomic mixed batches, delete/rebase and unique item/row identity cases.
- [x] 1.2 Add shared DOM regressions for structural insert/delete/tool grouping, unaffected node identity, dirty-row-only measurement and zero steady full-render fallback on both surfaces.
- [x] 1.3 Add direct typed message-count and replay/profile-window provenance regressions.

## 2. Shared page and render model

- [x] 2.1 Make tail metadata advance in the coordinator and replace the browser page slice/push mirror with an atomic bounded selected-page model.
- [x] 2.2 Replace item identity aliases with the shared item model plus explicit rowKey/itemIds presentation projection.
- [x] 2.3 Implement keyed dirty-interval structural reconciliation, dirty-row measurement and spacer-only geometry updates without recursive full render.

## 3. Shared child and region migration

- [x] 3.1 Move Chat and Skills transcript publication application, delivery ordering, rendering, ACK and rebase handling into the shared child controller.
- [x] 3.2 Add the direct typed message-count renderer and remove Chat full panel projection and Skills full runtime rendering from count-only updates.
- [x] 3.3 Align Host scheduling for co-emitted transcript/count changes and suppress unused steady frontend/conversation materialization.

## 4. Profiler, replay and documentation

- [x] 4.1 Record actual display mode, profile-owned publication stages and bounded render-work observations without changing the ACK envelope.
- [x] 4.2 Update profiler, parity and stall-risk documentation with the round3 root cause and the structural incremental acceptance contract.

## 5. Verification

- [x] 5.1 Run focused Node and Zotero tests for session, UI, publication, profiler and replay behavior.
- [ ] 5.2 Run lint, build and strict OpenSpec validation and confirm no generated help-docs or unrelated changes.
- [x] 5.3 Run same-trace boundary logical Replay when available and record any unavailable recorded-cadence/Zotero host gate explicitly.
