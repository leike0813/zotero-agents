## 1. Canary contracts and failing tests

- [x] 1.1 Add Core 199 coverage for authenticated full/source-slice graph-build parity, strict identity and DTO rebuilding, cancellation, and unchanged production composition.
- [x] 1.2 Extend Core 195/196 for a third mixed operation, shared backpressure/failure state, cancellation, and unchanged compute wire bounds.
- [x] 1.3 Extend Core 168/186/192-194 for canary inventory, engine checkpoint parity, capability surfaces, lifecycle termination, and forbidden sidecar authority.

## 2. Closed three-operation compute path

- [x] 2.1 Add `compute.citation_graph_build` and `citation_graph_build.v1` to the closed capability and protocol unions with exhaustive dispatch.
- [x] 2.2 Extend the shared pool and worker with strict graph-build request/result rebuilding and cooperative checkpoints.
- [x] 2.3 Route authenticated graph-build calls through the server with existing disconnect cancellation, stable errors, and response limits.
- [x] 2.4 Add `computeCitationGraphBuild` to the internal client by reusing the existing authenticated transport helper.

## 3. Production isolation and governance

- [x] 3.1 Keep production graph-build composition in process with no sidecar adapter, retry, fallback, UI, command, preference, or automatic shadow path.
- [x] 3.2 Mark graph build as an in-process sidecar canary while retaining two production workers, five other in-process engines, `108 / 1`, and `mutationEnabled: false`.
- [x] 3.3 Verify graph-build worker imports remain limited to engine DTO/kernel code and prohibited DB, repository, canonical, Host, Zotero, and child-process authority remains absent.

## 4. Packaging and documentation

- [x] 4.1 Compile and package `citationGraphBuild.js`; extend bundle, XPI, manifest, and fingerprint checks without adding dependencies or generating prebuilds.
- [x] 4.2 Update runtime, packaging, performance, Citation Graph, README, and Stage 1 progress docs with the internal canary and unchanged wire/production boundaries.

## 5. Verification

- [x] 5.1 Run contracts/engine/service/root TypeScript and focused Core 168/186/192-199 tests.
- [x] 5.2 Run service boundary, Synthesis invariants, targeted Prettier/ESLint, help-doc checks, production build, and `git diff --check`.
- [x] 5.3 Run strict OpenSpec validation and complete all tasks without archiving, committing, publishing prebuilds, or touching `reference/Skill-Runner`.
