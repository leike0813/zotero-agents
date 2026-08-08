## 1. Freeze Baseline and Retirement

- [x] 1.1 Record `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`, current HEAD/worktree identity, 131 baseline methods, 95 baseline wire operations plus the approved operation-control extension, and the exact 23-method deletion authorization in the migration SSOT
- [x] 1.2 Connect the service-boundary and production-capability checkers so every client-capability disposition maps to one wire operation, explicit Host owner, or approved retirement
- [x] 1.3 Mark the regression repair as candidate evidence and make both R9b deletion changes depend on this change's completed parity and scale gates
- [x] 1.4 Add baseline-derived normalized fixtures and extend existing corpora without snapshots of unstable text, paths, timestamps, or ordering

## 2. Add Failing Real-Route Evidence

- [x] 2.1 Extend the production-route test to execute every migrated operation through HTTP, Rust, SQLite, workers, and reverse Host
- [x] 2.2 Add table-driven differential assertions for DTO semantics, logical facts, canonical hashes, Host effects, idempotency, rollback, reopen, and read-only zero writes
- [x] 2.3 Move the governed 2k/10k/25k performance fixtures through native composition and record bytes, queries, Host calls, p50/p95, receipt latency, and RSS
- [x] 2.4 Add deterministic gates for Topic O(1) pages, Graph windowed queries, one-scan Reference refresh, and batched Tag effects

## 3. Close Harmful and Placeholder Routes

- [x] 3.1 Correct related-items echo consumption and add a no-Host-effect regression test
- [x] 3.2 Implement library-backed resolver semantics and strict Topic apply validation without empty-asset fallback
- [x] 3.3 Restore domain-specific Workbench Home, Topics, Review, Tags, Concepts, Reader, Index, and Graph projections
- [x] 3.4 Restore Topic digest/delete/purge lifecycle and replace fake debug/profiler/paper/diff projections with real data or stable unavailable terminals
- [x] 3.5 Normalize persisted/public timestamps to ISO-8601 and cover freshness, retry, and ordering semantics

## 4. Restore Wire and Operation Contracts

- [x] 4.1 Extend the operation manifest with operation-specific control/content and receipt policies and keep TypeScript/Rust resolution exact
- [x] 4.2 Reuse the existing authenticated transfer path for large Topic apply assets and artifact/review/export content
- [x] 4.3 Return the existing maintenance-operation receipt for all approved long mutations and update every grouped-client consumer
- [x] 4.4 Implement bounded phase progress, cancellation, retry, timeout, and single terminal behavior without a global queue
- [x] 4.5 Classify every manifest-owned public maintenance receipt by acceptance lifecycle state without applying inline business-result rules to the receipt envelope
- [x] 4.6 Separate short control-plane deadlines from explicit per-capability maintenance work deadlines and apply operation-specific worker phase deadlines to advanced matching and Graph layout
- [x] 4.7 Classify durable maintenance terminals from manifest-owned success rules, preserve raw failure codes, and keep accepted-operation traces active through their terminal

## 5. Replace Compatibility Routing

- [x] 5.1 Introduce typed Topic/Workbench/Workflow production adapters and remove their route-local DTO/business fallbacks
- [x] 5.2 Introduce typed Reference/Matching and Citation production adapters with application-owned behavior
- [x] 5.3 Introduce typed Tag/Concept/Topic Graph and durable/WebDAV/maintenance/debug adapters
- [x] 5.4 Delete `runtime_production_compat.rs` after the closed operation inventory has typed owners and route evidence

## 6. Bound Data Access and Concurrency

- [x] 6.1 Replace Topic N+1 and full-detail list materialization with compact joined pages and targeted details
- [x] 6.2 Replace Graph full-state reads with windowed topic-scope, metrics, and layout queries
- [x] 6.3 Replace Reference per-batch full-state scans with one snapshot/diff and changed-source keyed projection
- [x] 6.4 Batch Tag Host effects by 100 and bound ordered artifact reads to two concurrent calls
- [x] 6.5 Add one repository writer and at most four read-only connections without a new dependency

## 7. Preserve Durable Data

- [x] 7.1 Define the retained fact/cache classification and add a registered forward SQLite migration
- [x] 7.2 Preserve Topic, approved binding/redirect/review, and sync facts while marking rebuildable cache state stale
- [x] 7.3 Cover migration reopen, idempotency, failure rollback, and compatible recovery

## 8. Complete Domain Restoration

- [x] 8.1 Complete Workbench/Topic/Workflow baseline parity
- [x] 8.2 Complete Reference/Matching baseline parity
- [x] 8.3 Complete Citation baseline parity
- [x] 8.4 Complete Tag/Concept/Topic Graph baseline parity
- [x] 8.5 Complete import/export/WebDAV/durable/reset/recovery/debug baseline parity

## 9. Documentation and Verification

- [x] 9.1 Correct active architecture, runtime, persistence, performance, and migration documentation to match executable ownership and bounds
- [x] 9.2 Run strict OpenSpec, contract/surface, invariant, TypeScript, Rust fmt/clippy/workspace, production-route, performance, and production-build gates
- [x] 9.3 Run representative Zotero 7 and Zotero 9 Workbench/workflow checks and record remaining evidence without claiming release
- [x] 9.4 Confirm both R9b deletion changes remain blocked unless every task and external acceptance gate is complete
- [x] 9.5 Prove accepted receipt audit and trace behavior across all receipt capabilities, rerun the real Reference/Citation route evidence, and record the reopened acceptance result
- [x] 9.6 Add failing regression evidence for work beyond the control deadline, semantic worker failure, timeout, terminal trace retention, and Workbench operation diagnostics; rerun the affected TypeScript, Rust, contract, and OpenSpec gates

### 2026-08-08 verification evidence

- Executable source identity: `7b62dac066863118c108b121d289adf39836ee8d` plus executable/test diff SHA-256 `2850bc35a7dc388883561a8c643202586d42d73a0affe69924b150eb15378f18`; the current local Linux bundle used by both hosts had source fingerprint `36c8ecaeec137a528fe752dad5a66237cdfeb0ded91d66bd58839a0f3ace763a`, build fingerprint `cd9b1bd91d703173e488f9f299629e5b021910544792a9eae5160966fae2ddec`, and bundle ID `1881fc880af24e1b06ce99489d92175b1dae721478a0ee773afd4d9848006444`.
- Strict validation passed for this change and all 348 main specs. Contract/surface parity, invariants, Node Stage 1 (Core 175-235, including the production Rust route), Rust fmt/Clippy/workspace tests, production build, full Prettier/ESLint, and diff checks also passed.
- The governed production-route report passed all 2k/10k/25k gates. Duration p50/p95 in milliseconds was: 2k Topic `25.57/29.86`; 10k Topic `72.10/80.14`, chrome `6.28/7.11`, Index `16.98/18.54`, Graph slice `8.80/10.91`, Graph metrics `19.05/24.45`, Reference refresh `2038.12/2221.61`, and Tag effects `31.74/109.33`; 25k Topic `163.19/190.27`, chrome `4.67/10.44`, Index `12.97/13.90`, Graph slice `6.38/8.14`, and Graph metrics `6.16/6.60`. Topic stayed at two SQL queries from 2k to 25k; Graph reads used three; Reference refresh used 120 queries, with 100 item pages, 300 artifact pages, 100 artifact reads, maximum artifact-read concurrency one, and acceptance/terminal receipt p95 `7.24/2218.96 ms`; its incremental RSS p95 was `96858112` bytes. Tag effects used three Host calls in `100/100/50` batches.
- Zotero 7 used the official `7.0.32` Linux x86-64 tarball (SHA-256 `8ddd78ffcdb2fee4f4e4b40b4e9444fb356bed01ca37a5565835f9b6f32db1ee`); Zotero 9 used installed version `9.0.4`. Each ran with an isolated temporary profile, data directory, and runtime root. Both reached Rust readiness, rendered Home/Topics/Review/Tags/Concepts/Index/Graph without blank or error terminal states, exposed Create/Update Topic Synthesis, showed create parameters and the valid native empty update state, and reopened the same isolated data after a cold restart without owner or lock recovery errors. No backend workflow task was submitted.
- Seven-platform source-fresh prebuilds, governed final XPI/release-set assembly, signing, publication, R9b deletion, release, and Gitee synchronization were not run or authorized. This change is ready to archive but is not archived by this task.

### 2026-08-08 receipt classification repair evidence

- The native composition suite passed all 15 cases. Its table-driven receipt assertions cover all 16 manifest-owned `public-maintenance-operation` capabilities across accepted, terminal-success, declared terminal-failure, malformed, and unknown lifecycle states; the same 16 capabilities each produced a successful root operation trace for an accepted `pending` receipt without `semantic_non_success`.
- The production capability checker passed all 96 declared operations with no metadata error. Its current gate requires every public maintenance capability to declare both an explicit work deadline and a durable-terminal `semanticSuccess` rule while the Host continues to classify only the initial lifecycle envelope. The synthesis-contract TypeScript check, scoped Prettier/ESLint, and diff whitespace check also passed.
- The real Rust production-route rerun passed the closed 96-operation scenario matrix, the non-empty Reference refresh reverse-Host case, and the empty refreshed Reference readiness case. This exercises the Reference operations and Citation rebuild, refresh, metrics, and layout commands through native composition and their real route rather than a mocked UI result.
- Strict validation passed for the reopened change and all 348 main specs. Fresh desktop interaction was excluded from this repair evidence because the available Linux Computer Use provider lacked `python3-gi` and AT-SPI packages; no system dependency was installed, and the previously recorded Zotero 7/9 run was not relabeled as source-fresh evidence for this repair.

### 2026-08-08 asynchronous maintenance deadline and trace repair evidence

- The manifest now keeps the control plane at 10 seconds and gives all 16 public maintenance capabilities an explicit work deadline. Advanced Reference matching and its retry use 30 minutes; Citation Graph layout uses 120 seconds, with a 90-second paged worker phase; Reference binding and canonical dedupe worker phases use 15 minutes. Rust persists the work deadline in the operation basis, so continue/retry does not fall back to the control deadline.
- Durable terminal classification is manifest-owned. `promoted`/`unchanged`, domain `committed`/`unchanged`, and successful WebDAV queue states complete; unsuccessful domain status, `ok:false`, worker failure, cancellation, and timeout become the matching public operation terminal. Layout warnings and matching diagnostics retain raw worker codes, and Workbench includes the first stable code plus public operation ID.
- The focused TypeScript suites passed 106 cases, including all 16 receipt policies, Host-side trace pinning, eviction pressure, terminal unpinning, and Workbench diagnostic routing. Rust `synthesis-sidecar` passed 68 unit cases plus 9 worker-pool integration cases; the Reference matching application passed its 4 focused cases. Rust fmt and scoped Clippy with warnings denied passed.
- The rebuilt real Rust route passed the closed 96-operation scenario matrix and the targeted non-empty Reference/Citation route. The latter exercised advanced matching and layout through HTTP, SQLite, real paged workers, and reverse Host, and asserted `maintenance-started`, `maintenance-running`, and `maintenance-terminal` with public operation ID and capability for both operations.
- The production capability checker, synthesis-contract check, project TypeScript check, scoped ESLint/Prettier, and diff whitespace check passed. Strict validation passed for this change and all 348 main specs. No desktop server, prebuild, release, publication, archive, or Gitee synchronization was run.

## 10. Repair Citation Layout Self-loop Failure

- [x] 10.1 Add failing layout-engine regression evidence proving all algorithms treat a valid self-loop as layout-neutral while preserving graph identity
- [x] 10.2 Filter validated self-loops once before algorithm dispatch and document the durable-fact/layout-input boundary
- [x] 10.3 Add failing worker-supervision regression evidence for stable panic classification, then capture bounded stderr and return `worker_panicked` without leaking panic text
- [x] 10.4 Run focused Rust tests, format/lint/build gates, strict OpenSpec validation, and a read-only layout acceptance against the current real Synthesis database

### 2026-08-08 Citation self-loop and worker panic repair evidence

- The new layout regression first reproduced the ForceAtlas2 index-out-of-bounds panic, then passed for Force, Radial, and Components after validated self-loops became layout-neutral. The full `synthesis-citation-layout` crate passed all 5 tests.
- A real child-process regression first exposed panic stderr and returned `worker_crashed`; after bounded stderr capture it returned `worker_panicked` without emitting the private panic detail. The full `synthesis-sidecar` package passed 1 library, 69 binary, and 11 worker-pool integration tests.
- Rust format, scoped Clippy with warnings denied, the debug sidecar build, and strict validation of this OpenSpec change passed.
- A read-only immutable query of the current Synthesis database produced 2,292 nodes, 3,096 edges, and one self-loop. The rebuilt worker completed Force layout in 1,552 ms, returned all 2,292 nodes with the original graph hash, exited zero, and wrote no stderr. The database and deployed runtime were not modified.
