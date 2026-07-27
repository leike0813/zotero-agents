## 1. Verify Preconditions and Classify Ownership

- [ ] 1.1 Verify `stabilize-synthesis-r9a-retirement-baseline` local gates and accepted pre-deletion evidence, and record the exact source identity used by this change
- [ ] 1.2 Use code-graph impact plus static import inventory to classify every `src/modules/synthesisClient/**`, `src/modules/synthesis/**`, and harness dependency as legacy owner, neutral client/DTO, plugin Host/UI responsibility, pure current helper, or zero-caller code
- [ ] 1.3 Record an explicit deletion list and keep list before editing; do not delete whole directories or retained external Node oracle files by pattern

## 2. Add Failing Stable-Behavior and Boundary Tests

- [ ] 2.1 Extend existing client composition tests to prove the neutral port adapter preserves the exact 95-operation port and 96-method grouped public client with stable DTO/error behavior
- [ ] 2.2 Extend existing default-client, consumer, cutover, and shutdown tests to require one native generation, fail-closed unavailable/repair behavior, native-only cleanup, and zero legacy factory/root opening
- [ ] 2.3 Extend readonly harness tests to cover stable snapshot reads, retained Workbench surfaces, explicit blocked writes, and absence of legacy/native production owner construction
- [ ] 2.4 Add negative boundary fixtures for static import, dynamic import, aliased factory, direct DB/canonical opener, test hook, preference/environment selector, manifest selector, and backend registration
- [ ] 2.5 Identify tests that assert only legacy class structure, private call order, worker messages, or complete text; mark them for deletion rather than porting brittle assertions

## 3. Extract the Neutral Grouped Client Adapter

- [ ] 3.1 Move `SynthesisClientPort`, grouped facade construction, DTO rebuilding, and stable error mapping from `inProcessClient.ts` into one neutrally named adapter without semantic changes
- [ ] 3.2 Switch `nativeComposition.ts`, production capability checks, and bounded fake-port tests to the neutral adapter
- [ ] 3.3 Remove all persistence, canonical, Host, engine, service, lifecycle, and implementation-selection dependencies from the neutral adapter
- [ ] 3.4 Delete the old in-process client factory and filename after exact inventory/client parity tests pass

## 4. Migrate the Readonly Harness

- [ ] 4.1 Replace `createLegacyInProcessSynthesisClient` usage in the readonly harness with dedicated readonly SQLite snapshot/query adapters and the neutral grouped client only where the reused UI requires it
- [ ] 4.2 Preserve Topics, Index, Tags, Concepts, Review, Graph, chrome, localization, generation, last-known-good, and transient-error observable behavior
- [ ] 4.3 Keep mutation commands mocked/blocked and prove the harness cannot acquire owner locks, open canonical writers, use WebDAV credentials, invoke Host effects, or start native production mutations
- [ ] 4.4 Remove harness-only legacy service/repository adapters and mocks after their callers reach zero

## 5. Delete the Plugin Legacy Owner

- [ ] 5.1 Delete `src/modules/synthesisClient/legacyComposition.ts` and every default legacy service getter, invalidator, disposer, cache, factory, and export
- [ ] 5.2 Delete `src/modules/synthesis/service.ts`, `src/modules/synthesis/repository.ts`, and their plugin production owner/root-opening composition
- [ ] 5.3 Delete owner-specific domain orchestration, in-process engine adapters, lifecycle hooks, and helper modules proven to have no retained plugin or external-oracle caller
- [ ] 5.4 Preserve bounded reverse-Host read/effect adapters, export/WebDAV delivery adapters, Zotero item/tag adapters, UI models, item observer, Workbench bridges, localization, and pure current projections
- [ ] 5.5 Remove legacy implementation-detail tests, fixtures, mocks, exports, and documentation references assigned to this change

## 6. Strengthen Source and Build Boundaries

- [ ] 6.1 Change `check-synthesis-service-boundary.ts` from an allowlisted direct-consumer model to zero legacy construction, zero implementation selector, and zero ordinary production-root opener
- [ ] 6.2 Keep only explicit cutover backup/restore and native supervisor path exceptions, and prove they cannot construct an application owner
- [ ] 6.3 Confirm default client, Workflow, Workbench, Host Bridge, MCP, startup, maintenance, shutdown, tests, and harnesses have no legacy import or dynamic construction path
- [ ] 6.4 Confirm the retained `apps/synthesis-service` tree is still frozen, development-only, and reachable only from paths assigned to `remove-synthesis-node-sidecar-stack`

## 7. Documentation and Verification

- [ ] 7.1 Update current Synthesis client, lifecycle, persistence, harness, service-boundary, and migration documentation to describe the native-only plugin and the separately retained external Node oracle
- [ ] 7.2 Run strict OpenSpec validation for this change and modified specs
- [ ] 7.3 Run focused client/default-lifecycle/consumer/harness/cutover/boundary tests and the complete R9a Core 219-235 suite
- [ ] 7.4 Run relevant Stage-1 tests, TypeScript package/plugin checks, readonly harness build/tests, and production build without starting a development server
- [ ] 7.5 Run Rust format, clippy, workspace tests, service/worker smoke, and package freshness checks to prove plugin deletion did not weaken native behavior
- [ ] 7.6 Verify the final source/build inventory contains no constructible plugin legacy owner and record all remaining Node-sidecar files for the next change
- [ ] 7.7 Do not publish or release the intermediate tree; continue to `remove-synthesis-node-sidecar-stack`

