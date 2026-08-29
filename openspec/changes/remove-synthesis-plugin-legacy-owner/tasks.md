> Lifecycle boundary: preserve the XPI-only session lifecycle and do not
> reintroduce cutover, admission, activation, critical smoke, owner/lease
> files, persisted runtime generations, or plugin backup/restore.

## 1. Verify Preconditions and Classify Ownership

- [x] 1.1 Verify `stabilize-synthesis-r9a-retirement-baseline` and every task plus external parity/10k/25k gate in `restore-synthesis-rust-sidecar-main-parity`, accept its candidate evidence for the exact source identity, and record that identity before deletion
- [x] 1.2 Use code-graph impact plus static import inventory to classify every `src/modules/synthesisClient/**`, `src/modules/synthesis/**`, and harness dependency as legacy owner, neutral client/DTO, plugin Host/UI responsibility, pure current helper, or zero-caller code
- [x] 1.3 Record an explicit deletion list and keep list before editing; do not delete whole directories or retained external Node oracle files by pattern

## 2. Add Failing Stable-Behavior and Boundary Tests

- [x] 2.1 Extend existing client composition tests to prove the neutral port adapter exactly matches the current production operation manifest and grouped public client with stable DTO/error behavior
- [x] 2.2 Extend existing default-client, consumer, supervisor, and shutdown tests to require one current-session native composition, fail-closed unavailable/repair behavior, native-only cleanup, and zero legacy factory/root opening
- [x] 2.3 Extend readonly harness tests to cover stable snapshot reads, retained Workbench surfaces, explicit blocked writes, and absence of legacy/native production owner construction
- [x] 2.4 Add negative boundary fixtures for static import, dynamic import, aliased factory, direct DB/canonical opener, test hook, preference/environment selector, manifest selector, and backend registration
- [x] 2.5 Identify tests that assert only legacy class structure, private call order, worker messages, or complete text; mark them for deletion rather than porting brittle assertions

## 3. Extract the Neutral Grouped Client Adapter

- [x] 3.1 Move `SynthesisClientPort`, grouped facade construction, DTO rebuilding, and stable error mapping from `inProcessClient.ts` into one neutrally named adapter without semantic changes
- [x] 3.2 Switch `nativeComposition.ts`, production capability checks, and bounded fake-port tests to the neutral adapter
- [x] 3.3 Remove all persistence, canonical, Host, engine, service, lifecycle, and implementation-selection dependencies from the neutral adapter
- [x] 3.4 Delete the old in-process client factory and filename after exact inventory/client parity tests pass

## 4. Migrate the Readonly Harness

- [x] 4.1 Replace `createLegacyInProcessSynthesisClient` usage in the readonly harness with dedicated readonly SQLite snapshot/query adapters and the neutral grouped client only where the reused UI requires it
- [x] 4.2 Preserve Topics, Index, Tags, Concepts, Review, Graph, chrome, localization, generation, last-known-good, and transient-error observable behavior
- [x] 4.3 Keep mutation commands mocked/blocked and prove the harness cannot acquire owner locks, open canonical writers, use WebDAV credentials, invoke Host effects, or start native production mutations
- [x] 4.4 Remove harness-only legacy service/repository adapters and mocks after their callers reach zero

## 5. Delete the Plugin Legacy Owner

- [x] 5.1 Delete `src/modules/synthesisClient/legacyComposition.ts` and every default legacy service getter, invalidator, disposer, cache, factory, and export
- [x] 5.2 Delete `src/modules/synthesis/service.ts`, `src/modules/synthesis/repository.ts`, and their plugin production owner/root-opening composition
- [x] 5.3 Delete owner-specific domain orchestration, in-process engine adapters, lifecycle hooks, and helper modules proven to have no retained plugin or external-oracle caller
- [x] 5.4 Preserve bounded reverse-Host read/effect adapters, export/WebDAV delivery adapters, Zotero item/tag adapters, UI models, item observer, Workbench bridges, localization, and pure current projections
- [x] 5.5 Remove legacy implementation-detail tests, fixtures, mocks, exports, and documentation references assigned to this change

## 6. Strengthen Source and Build Boundaries

- [x] 6.1 Change `check-synthesis-service-boundary.ts` from an allowlisted direct-consumer model to zero legacy construction, zero implementation selector, and zero ordinary production-root opener
- [x] 6.2 Keep only the native supervisor's opaque production-path handoff exception, and prove it cannot construct a plugin application owner
- [x] 6.3 Confirm default client, Workflow, Workbench, Host Bridge, MCP, startup, maintenance, shutdown, tests, and harnesses have no legacy import or dynamic construction path
- [x] 6.4 Confirm the successor `remove-synthesis-node-sidecar-stack` removes the formerly retained external Node tree without restoring any plugin owner path

## 7. Documentation and Verification

- [x] 7.1 Update current Synthesis client, lifecycle, persistence, harness, service-boundary, and migration documentation to describe the native-only plugin and the successor's removal of the external Node oracle
- [x] 7.2 Run strict OpenSpec validation for this change and modified specs
- [x] 7.3 Run focused client/default-lifecycle/consumer/harness/supervisor/boundary tests and the governed Synthesis Stage-1 suite
- [x] 7.4 Run relevant Stage-1 tests, TypeScript package/plugin checks, readonly harness build/tests, and production build without starting a development server
- [ ] 7.5 Run Rust format, clippy, workspace tests, service/worker smoke, and package freshness checks to prove plugin deletion did not weaken native behavior
- [x] 7.6 Verify the final source/build inventory contains no constructible plugin legacy owner and that the successor removes the recorded Node-sidecar inventory
- [x] 7.7 Do not publish or release the intermediate tree; continue to `remove-synthesis-node-sidecar-stack`
