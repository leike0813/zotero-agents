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

## 11. Repair Tag Public DTO Routing

- [x] 11.1 Add failing real production-route evidence for public vocabulary save/reopen and staged-suggestion add/list behavior
- [x] 11.2 Define the grouped Tag public DTOs explicitly and remove repository-record requirements from the native adapter boundary
- [x] 11.3 Restore application-owned vocabulary entry and staged-suggestion mutation semantics, including update, delete, discard, and promotion
- [x] 11.4 Replace false-green Tag `invalid_request` acceptance evidence and run focused TypeScript, Rust, workflow, production-route, and strict OpenSpec gates

### 2026-08-09 Tag public DTO repair evidence

- The new real-route regression first failed before Host RPC because `loadTagVocabulary` omitted public `aliases`, `abbrev`, and `protocol`; after repair it exercised native composition, HTTP, Rust, SQLite, and cold reopen for vocabulary save, staged add/update/discard/promote, entry update/delete, import merge, aliases, abbreviations, protocol, and audit replacement.
- Tag public DTO reconstruction now belongs to the typed adapter and Tag application service. Repository records, serialized JSON columns, revision fields, and timestamps are no longer required public mutation inputs. Builtin policy initialization and import/staged/vocabulary mutation rules are application-owned, and library audit replacement is one repository transaction.
- The fixed-baseline scenario no longer classifies valid Tag requests as `invalid_request` or `unavailable`. The Tag parity checker rejects any future stable-error classification for the 19 ready Tag operations, and the closed 96-operation native-composition matrix passed with valid Tag DTOs.
- TypeScript, synthesis-contract, production-capability, typed-application, Tag application parity, ESLint, Prettier, Rust format/Clippy/build, all 209 Rust workspace tests, focused Tag Regulator workflow tests, four real production-route/roster cases, and strict OpenSpec validation passed. No server, release, publication, archive, or Gitee synchronization was run.

## 12. Repair Workflow Tag Surface Invalidation

- [x] 12.1 Add failing behavior evidence that successful workflow Tag mutations invalidate the Tags Workbench surface
- [x] 12.2 Make affected Workbench surfaces explicit in the sidecar-change event and publish Tags invalidation after workflow vocabulary save, staged add, and staged discard
- [x] 12.3 Run focused workflow, Workbench, Tag Regulator, real production-route, formatting, lint, and strict OpenSpec gates and record the result
- [x] 12.4 Add failing real production-route evidence that the Workbench Tags projection includes the same staged rows as the Tag staged-list capability
- [x] 12.5 Compose the Workbench Tags DTO from public vocabulary and staged application reads, rebuild the native sidecar, and rerun focused gates

### 2026-08-09 Workflow Tag surface invalidation evidence

- The workflow-client regression first observed no invalidation after vocabulary save, staged add, or staged discard, while existing notifications carried no affected-surface identity. After repair, all three successful Tag mutations publish Tags-only invalidation; digest and Tag audit paths retain their prior Index/Graph scopes through the same explicit contract.
- The Workbench invalidation event now carries the exact affected surface set, deduplicates it once, and passes it unchanged to listeners. The Workbench marks only those surfaces dirty, immediately refreshes the active affected surface, and leaves inactive affected surfaces dirty until selected.
- The workflow-client suite passed 9 cases, the full Workbench UI model suite passed 83, Tag Regulator apply-intake passed 16, and the real Rust production-route staged DTO save/list/reopen case passed. Project TypeScript, scoped ESLint, scoped Prettier, diff whitespace, and strict OpenSpec validation passed. No server, release, publication, archive, or Gitee synchronization was run.

### 2026-08-09 Workbench Tags staged projection evidence

- A read-only query against the active Zotero Synthesis database found four staged suggestions, and the active sidecar's direct staged-list capability returned the same four public rows. Its Workbench Tags surface nevertheless omitted the `staged` field, reproducing the empty inbox independently of UI state and proving the projection defect.
- The new real production-route assertion first failed because `tags.staged` was absent. The typed Workbench adapter now composes the Tags DTO directly from `load_public_vocabulary` and `list_public_staged`; the same route test passes with the staged row and its public facet, note, source flow, and stable parent binding, including cold reopen coverage from the enclosing case.
- The debug native sidecar was rebuilt. The `synthesis-sidecar` package passed 1 library test, 67 binary tests, and 11 worker-pool integration tests; workspace Clippy with warnings denied, Rust format, project TypeScript, scoped ESLint, scoped Prettier, diff whitespace, and strict OpenSpec validation passed. The already-running Zotero process still owns the prior staged sidecar copy and must be restarted before desktop verification. No development server, release, publication, archive, or Gitee synchronization was run.

## 13. Repair Artifact Export Control/Data Plane Separation

- [x] 13.1 Add failing real production-route coverage for local and remote artifact exports whose content exceeds the 1 MiB reverse-Host request bound
- [x] 13.2 Extend the existing authenticated output-transfer contract with a hash-bound artifact-export target and bounded reverse-Host descriptor
- [x] 13.3 Stage export entries in Rust, drain and verify them in the plugin, preserve manifest-last local materialization, and cancel transfer sessions on every terminal outcome
- [x] 13.4 Run focused contract, TypeScript, Rust, real production-route, formatting, lint, build, and strict OpenSpec gates and record the result

### 2026-08-10 Artifact export control/data plane repair evidence

- The real Rust production-route case exports a references artifact larger than 1 MiB through both local and remote delivery. Both reverse-Host calls contain only the destination fields and the hash-bound `contentTransfer` descriptor, remain below the unchanged 1 MiB request limit, and reproduce identical manifest/content bytes. A third injected remote-delivery failure proves that Rust cancels the staged transfer on both success and failure.
- `host_export_entries` reuses the authenticated output-transfer lifecycle and canonical JSON chunk encoding. The plugin verifies transfer version, target, capability, root hash, ordered page descriptors, page bodies, aggregate byte length, and content hash before rebuilding the bounded export DTO. Local workspace materialization validates the complete request before I/O and writes `paper-artifacts-manifest.json` last; remote delivery continues through the existing ZIP/file port.
- Project TypeScript and synthesis-contract checks passed. The focused Host export, native composition, reverse-Host, Artifact/Library/Debug surface, and large real-route suites passed 30, 15, and 1 cases in their final grouped runs. Production-capability, artifact-surface, worker-transfer, and native-runtime parity checks passed.
- The Rust workspace passed all tests; the final `synthesis-sidecar` binary suite passed 68 cases, including hash-bound export publication and cleanup. Rust format, workspace Clippy with warnings denied, the debug build, scoped Prettier/ESLint, and diff checks passed. Strict OpenSpec validation passed for this change and all 353 main specs.
- A verified Linux x64 candidate package was produced outside the worktree at `/tmp/zotero-agents-synthesis-sidecar-package-20260810` with bundle ID `dc9d10799319022a7b48b5ae8f5b926324fbce8988ed5303c8a2682c87346d39` and build fingerprint `6e2de256499a6bf5178dd52f6cc2fa872cd02f50f5333e510dc4dfaeb74599a6`. No development server, desktop process, prebuild, release, publication, or Gitee synchronization was run.

## 14. Repair Topic and Concept Workbench Visibility

- [x] 14.1 Add failing workflow and real production-route evidence for Topic apply invalidation, public Topic/Concept Workbench DTOs, controlled sidecar resolution, Concept ingestion, and cold reopen
- [x] 14.2 Resolve optional sidecars from the controlled analysis manifest and route Concept proposals through the Concept application without weakening Topic commit semantics
- [x] 14.3 Compose public Topic and Concept Workbench projections and invalidate every affected surface after successful workflow apply
- [x] 14.4 Run focused TypeScript, Rust, production-route, formatting, lint, and strict OpenSpec gates and record the result

### 2026-08-10 Topic and Concept Workbench visibility evidence

- The workflow regression first completed Topic apply without publishing a Workbench invalidation event. The real Rust production route then persisted the Topic but returned an artifact without public `id`, so UI normalization discarded it; the same route had no public Concept row because proposal sidecars were neither resolved from the controlled analysis manifest nor ingested into Concept KB.
- Topic apply now resolves optional sidecars through the materialized analysis manifest (with the artifact manifest as the controlled locator fallback), persists its owned Topic projection first, and then routes valid Concept proposals through `ConceptKbApplication`. A Concept projection failure records `concept_cards_proposal_failed` without rolling back the committed Topic.
- The Workbench adapter now adds the public Topic artifact identity and reconstructs Concept DTOs from repository records by decoding stored JSON columns into snake-case domain arrays and objects. Successful workflow apply invalidates Home, Topics, Concepts, Graph, and Review; the same surface set is used by Workbench Topic synthesis commands.
- The workflow suite passed 9 cases, the Workbench UI model suite passed 85, and the complete real Rust production-route suite passed 10, including controlled locator resolution, UI normalization, and Concept persistence after process reopen. Project TypeScript, scoped ESLint/Prettier, diff whitespace, Rust format, workspace Clippy, the debug sidecar build, all 211 Rust workspace tests, Topic/Workbench and Concept/Topic Graph parity checks, and strict validation of all 357 OpenSpec items passed. No development server, desktop process, release, publication, archive, or Gitee synchronization was run.

## 15. Repair Topic Graph and Readiness Projection

- [x] 15.1 Add failing application and real production-route evidence for Topic Graph materialization, Topics Graph surface composition, full Topic readiness DTOs, and cold reopen
- [x] 15.2 Persist native Topic dependency readiness facts and derive typed freshness, source-material status, percentage, reasons, and update intent without legacy JSON state
- [x] 15.3 Materialize committed Topics and controlled relation proposals through `TopicGraphApplication`, and compose the bounded canonical graph into the Topics surface
- [x] 15.4 Correct active Topic/readiness documentation and run focused TypeScript, Rust, migration, production-route, formatting, lint, and strict OpenSpec gates

### 2026-08-10 Topic Graph and readiness projection repair evidence

- The application regression first reproduced a committed Topic with zero canonical Topic Graph nodes. The repaired Topic application materializes the committed node, preserves user-owned graph attributes during later reconciliation, ingests controlled relation proposals, and returns a stable projection warning without weakening Topic commit semantics. A separate regression proves that startup reconciliation backfills an existing Topic once and is unchanged on the second pass.
- The real Rust production-route lifecycle now returns a public Topic row with `kind`, typed freshness, source-material status and percentage, plus a bounded canonical `topicGraph` projection. It passed apply, UI normalization, delete, cold reopen, rebuild, and purge; the complete production-route suite passed all 10 cases, including the closed 96-operation matrix.
- Topic dependency readiness is stored with the existing native Topic projection and derives from the saved paper set plus `digest`, `references`, and `citation_analysis` status/hash facts. Existing rows without a baseline use complete current evidence deterministically or report `readiness_baseline_missing`; Workbench reads remain read-only. A read-only query of the active database found `33/33` available required dependencies for `large-language-models` and `12/51` for the LoRA Topic, demonstrating that the two rows no longer collapse to the same missing/zero state. The active database was not modified.
- Shared synthesis-contract and project TypeScript checks, the 85-case Workbench UI model suite, Rust format, workspace Clippy with warnings denied, all Rust workspace tests, production capability/service-boundary checks, scoped Prettier/ESLint, diff checks, and strict OpenSpec validation passed. No development server, desktop process, release, publication, archive, or Gitee synchronization was run.

## 16. Restore End-to-End Review Behavior

- [x] 16.1 Add failing application, Workbench-normalization, and real production-route evidence for Reference binding/merge/canonical revision, Concept, and Topic Graph review generation, projection, mutation, filtering, and cold reopen
- [x] 16.2 Replace the parallel Rust Review payloads with the bounded public `registry`, `concepts`, `topicGraph`, and aggregate `reviews.summary` projections
- [x] 16.3 Restore stable diagnostic results, independent Reference batch decisions, and transition-basis-aware receipt reuse for reversible review actions
- [x] 16.4 Preserve Concept/Topic Graph stale-index boundaries, two-stage relation approval, and confirmed `broader_than` discovery consumption without automatic rebuilds
- [x] 16.5 Correct active Review documentation and run focused TypeScript, Rust, parity, production-route, formatting, build, and strict OpenSpec gates

### 2026-08-10 Review repair evidence

- Reference Review now uses one bounded repository query path for matching and canonical-revision rows, exposes only the current-page canonical context plus a bounded manual-target list, and projects the same public `registry` DTO from Review and Index. Independent batch decisions commit valid actions even when a sibling action fails, while receipt reuse compares the persisted before/after proposal state so Accept -> Reopen -> Accept executes the second Accept.
- Concept and Topic Graph Review now filter and count before materialization, return singular structured diagnostics for missing, closed, stale-basis, and invalid-target decisions, and mark indexes stale without rebuilding. Low-confidence relation approval remains two-stage; confirming a `broader_than` edge refreshes the persisted discovery cascade without rewriting the Topic or triggering an automatic rebuild.
- The real Rust production route passed all 10 cases, including actual Reference matching, Index/Review projection, Concept review mutation, Topic Graph review mutation, cold reopen, and the closed 96-operation matrix. The 85-case Workbench UI suite and the complete Rust workspace test suite passed.
- Shared synthesis-contract and project TypeScript checks, Rust format, workspace Clippy with warnings denied, the production capability and Review surface/application parity checks, scoped Prettier/ESLint, sidecar build, diff checks, and strict OpenSpec validation passed. No development server, release, publication, archive, or Gitee synchronization was run.

## 17. Repair Citation Graph Visibility and Runtime Guarding

- [x] 17.1 Record the distinct-source Citation visibility, shared bounded projection, JSON-safe Workbench state, layout terminal, and runtime-status contracts
- [x] 17.2 Add failing regressions for degree-one visibility, projection/layout parity, hover-only rendering, optional-state serialization, layout deadline/recovery, and runtime status
- [x] 17.3 Make public Graph pages and layout consume one bounded projection and restore ephemeral hover neighborhoods without stale Sigma nodes
- [x] 17.4 Make Workbench state JSON-safe, harden layout deadlines and detached operation terminals, and add the bounded top-bar sidecar indicator
- [x] 17.5 Correct active documentation and run focused TypeScript, Rust, formatting, build, and strict OpenSpec gates

### 2026-08-10 Citation Graph visibility and runtime guarding evidence

- Citation Graph projection now counts distinct library sources, keeps degree-one external targets hover-only even when an upstream DTO misclassifies them, and applies the same 20,000-node/80,000-edge endpoint-closed projection to default public pages and layout. The large repository pagination regression drained 7,500 nodes and 12,000 edges without dangling endpoints; application projection tests covered repeated same-source edges and bounded tier ordering.
- Workbench removes cleared optional selections before strict JSON serialization. The exact `graph.selectedElement = undefined` reproduction now omits the field, and the complete focused TypeScript suite passed all 88 tests.
- Layout uses a 90-second direct worker phase, a 120-second public operation deadline, and a 130-second client observation bound. Detached dispatch catches panic, retries terminal persistence once, and keeps receipt reads pure; startup reconciliation remains responsible for restart orphans.
- The top bar exposes a keyboard-accessible bounded sidecar indicator. Foreground health observation is coalesced at five seconds, updates chrome only, restarts on degraded compute health through the existing supervisor policy, and excludes repository/path/credential/raw-error fields. All 11 locale bundles contain the 13 indicator keys.
- Main and Sidebar TypeScript checks, shared contract checks, scoped Prettier/ESLint, `git diff --check`, Rust format, warnings-denied Clippy for the three changed crates, focused Rust tests, sidecar build, Citation Graph surface parity, 96-capability parity, native runtime contract parity, and strict OpenSpec validation passed.

## 18. Repair Native WebDAV Timestamp Migration

- [x] 18.1 Record the local-state and remote-HEAD migration contract and add failing Rust plus real production-route evidence for the historical decimal-millisecond clock
- [x] 18.2 Canonicalize only known native-owned WebDAV timestamps at persistence read boundaries while preserving strict validation and atomic state persistence
- [x] 18.3 Correct active persistence and WebDAV recovery documentation without changing public DTOs, schema versions, or startup trace contracts
- [x] 18.4 Run focused and workspace Rust tests, the real production-route regression, WebDAV parity checks, formatting/lint, diff, and strict OpenSpec gates and record the result

### 2026-08-11 Native WebDAV timestamp migration evidence

- The focused Rust regressions first failed with `webdav_sync_state_invalid` for local state and `webdav_sync_head_invalid` for a remote pointer. After the repair, all 10 WebDAV application tests passed, including exact decimal-millisecond migration for state, last-run, retry-base, and HEAD timestamps plus strict rejection of signed, fractional, leading-zero, and overflowing forms.
- The real Rust production-route regression passed against an isolated disabled profile: startup reconciliation returned ready, atomically replaced the historical local timestamp with ISO-8601, and reopened the same state successfully. The unchanged TypeScript WebDAV application suite passed all 8 cases, and the WebDAV/Maintenance surface parity gate passed all 10 operations.
- The complete Rust workspace passed 227 tests. Workspace Clippy with warnings denied, Rust format, the debug sidecar build, project and synthesis-contract TypeScript checks, scoped ESLint/Prettier, diff whitespace, and strict validation of all 357 OpenSpec items passed.
- The broader checkpoint/bundle/WebDAV/debug application parity gate still reports only `table_mismatch:synt_schema_meta`: Rust contains `reference_redirect_graph_schema_version` while the Node oracle does not. That row was introduced by the pre-existing `522523c7` redirect-cycle repair; this change does not touch repository schema and leaves that independent cross-implementation drift visible. No development server, profile state, release, publication, archive, or Gitee synchronization was modified.
