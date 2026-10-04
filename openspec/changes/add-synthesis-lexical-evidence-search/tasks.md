# Tasks

## 1. Shared search contract and Rust lexical kernel

- [ ] 1.1 Add shared TypeScript request/result DTOs and strict rebuilders with the exact names and closed shapes in `design.md`; verify representative valid/invalid rebuild cases and keep C1 filter renaming outside search DTOs.
- [ ] 1.2 Add the closed schema and parity corpus to the existing `synthesis-sidecar-protocol-v1` schema tree and registry; run schema validation and Rust/TypeScript parity checks for source/location unions, `invalid_source`, `result_budget_exhausted`, limits, empty arrays, unknown keys, UTF-16 ranges, and opaque source versions.
- [ ] 1.3 Add `lexical_search.rs` as the only lexical kernel. Verify Unicode normalization, case handling, script-aware tokenization, phrase/field/coverage/identity ordering, original-offset mapping, and bounded scans with focused Rust tests; add no TypeScript kernel or dependency.
- [ ] 1.4 Add Rust DTO/schema parity checks against shared fixtures and verify equivalent TypeScript rebuilders accept and reject the same boundary cases.

## 2. Broker-owned source facts and Retrieval Application

- [ ] 2.1 Add the private source descriptor and source read/version-check seam, with canonical Zotero Host Capability Broker as the sole owner of source identity, eligibility, scope, and facts; verify Broker behavior and confirm `libraryAdapter.ts` only transports Broker requests/results without defining a parallel source catalog.
- [ ] 2.2 Extend the current reverse-Host and `SynthesisHostReadPort` contracts for bounded descriptor enumeration and complete source reads. Reuse current canonical analysis hash reads, add Markdown owner-version reads through the actual Markdown read path and runtime adapter, and verify attachment item revision is never used as Markdown content version.
- [ ] 2.3 Add the Rust `evidence_search.rs` deep Retrieval Application and inject the private source port. Verify intersecting library/collection/tag/itemType/itemRefs scope, sourceKinds union/empty semantics, segmentation, deterministic ordering, and basis-bound opaque cursor behavior.
- [ ] 2.4 Verify each returned passage with a bounded second Broker/source-owner read against captured scope, opaque sourceVersion, and exact range; assert full content/format/source/location is returned only when verified, with independently located supplementary context.
- [ ] 2.5 Compose the Retrieval Application in the existing Rust `ProductionApplications` runtime and verify bounded current-source retrieval with no persistent lexical index, new storage format, worker-pool route, or separate process.

## 3. Typed client and Workflow Host

- [ ] 3.1 Add concrete root `SynthesisClient.searchEvidence` request/result mapping through the grouped client, neutral port, client adapter, native composition, closed production operation inventory, and Rust route; verify operation inventory and strict DTO checks.
- [ ] 3.2 Add explicit `host.synthesis.searchEvidence` Workflow Host type/projection with existing typed error adaptation; verify C3's `host.library.searchItems` projection remains its own change and is not added here.
- [ ] 3.3 Add a vertical production-route test from typed client through Rust runtime and reverse-Host to Broker-owned source reads, covering verified passage success, invalid request, stale source, unavailable owner, bounded issues, and no path leakage.

## 4. Host Bridge, MCP, CLI, and agent-facing surfaces

- [ ] 4.1 Add remote capability `synthesis.search_evidence`, its closed input/output schemas, and validated Host Bridge handler delegating only to typed `SynthesisClient.searchEvidence`; verify request rejection before dispatch and output contract validation.
- [ ] 4.2 Mirror the exact capability and behavior through MCP; verify MCP/Host Bridge capability-handler parity, typed error preservation, and bounded output.
- [ ] 4.3 Add Rust CLI `synthesis evidence search` to argument parsing, dispatch, and CLI command contract, preserving `--query` JSON-container semantics; verify the contained query and scope are validated before the remote call.
- [ ] 4.4 Update the source command catalog and render its generated command references through the existing renderer; verify generated output consistency without creating a parallel command card source.
- [ ] 4.5 Before changing Host Bridge agent-facing instructions, record baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`, all affected materialized-file metrics, and an empty semantic deletion list. Render all affected surfaces and verify absolute depth, substantive instruction line count not below baseline, normalized prose characters at least 95%, and report unmapped/downgraded/unauthorized-dropped/intra-package-duplicate counts; separately review semantic parity.
- [ ] 4.6 Verify end-to-end CLI and MCP calls reach the same Host Bridge handler, native Rust Retrieval Application, and Broker-owned source read, retaining `completed | limited | unavailable`, actual method, coverage/issues, cursor, and accurate-or-null total.

## 5. Shared-change compatibility and strict validation

- [ ] 5.1 Verify C3 can call the same Rust Retrieval Application/kernel via its private injected native port without Broker depending on public `SynthesisClient`; verify C4 can reuse the kernel and shared result/coverage/issues/sourceKinds names with a Topic-specific `sections` extension.
- [ ] 5.2 Verify C1 remains only list/traversal/readiness filter naming and has no lexical search or TypeScript-kernel dependency.
- [ ] 5.3 Run focused contract, Rust kernel/application, production-route, Host Bridge, MCP, CLI render, and agent-surface parity checks; run `openspec validate add-synthesis-lexical-evidence-search --strict` and confirm all planning artifacts report done.
