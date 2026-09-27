## 1. Contract and baseline

- [x] 1.1 Adopt the merged PR40 typed Preact Dashboard/Synthesis region and shared-region equality foundation as the implementation baseline; verify the recorded PR40 build and UI evidence remains available before adding MigrationsRegion
- [x] 1.2 Extract the existing contract-set schema owner and freeze the approved D1 fields (`extraction: { raw, confidence } | null`, bibliographic title/authors/year, renderer metadata, one DOI/URL/ISBN/ISSN/citekey field, and Citation evidence); verify TS/Rust/upstream renderer examples agree and record any missing upstream pin/build evidence (verified by the contract-set schemas, producer smoke, TS/Rust parity checks, and the recorded detached upstream state)
- [x] 1.3 Freeze D2 authoring/import rules for retained versus newly allocated opaque `sourceReferenceId`, runtime-computed References basis, and derived Citation staleness; verify positive and negative identity fixtures (verified by contract tests 270/274, Application projection tests, and stale-basis tests)
- [x] 1.4 Define the six managed semantic operations, ordinary-note protection, closed error/result DTOs, and 1 MiB Broker versus 50 KiB downstream ToolResult budgets; verify contract-level validation rejects aliases and unknown fields (verified by Broker operation tests and contract test 270)

## 2. Broker semantic owner

- [x] 2.1 Implement the Broker-owned managed-note reader/writer for custom, conversation-note, digest, references, citation-analysis, and literature-score; verify six-operation round trips and zero/one/multiple singleton behavior
- [x] 2.2 Implement discriminated ordinary/managed detail with complete semantic payload and serialized byte facts; verify results over 50 KiB but within 1 MiB remain complete and results over 1 MiB return typed `resource_limited`
- [x] 2.3 Enforce ordinary-note and `notes.updateContent` protection, reserved marker rejection, and fail-closed damaged/ambiguous handling; verify no note or attachment mutation occurs on rejected inputs
- [x] 2.4 Implement the private trusted parent-set writer so paired References/Citation writes use one operation identity, one Zotero transaction, one durable set receipt, and runtime-computed basis; verify preflight failure produces no partial pair
- [x] 2.5 Migrate Broker-facing Workflow, bundle, import, and Workbench callers to semantic operations and remove package-local list/create/upsert/cleanup orchestration; verify caller audit has no remaining production path (verified by the final production caller audit, Broker/Workflow build, and bundle 47 suite)
- [x] 2.6 Close DEL-12 and DEL-13 symbols only after all callers are migrated, including aliases, duplicate DTOs, loose readers, reverse-export shapes, and public reference helpers; verify the deletion inventory and replacement behavior tests (verified by the final zero-caller audit and the managed-note/import consumer suites)

## 3. Workbench, bundle, and Synthesis consumers

- [x] 3.1 Route literature-analysis readiness and apply through the canonical classifier and managed writer, including one parent-set commit for References/Citation; verify score-only/full mode and invalid legacy-result behavior (verified by the final analysis complete and Broker/Bridge evidence: full-mode, score-only, source, sidecar, duplicate, and invalid-result no-write cases; 21/50 suite aggregate 43 passing)
- [x] 3.2 Update custom-note import/export and Literature Product/Research Product round trips to carry canonical semantic artifacts, explicit opaque IDs, Citation evidence, and derived-resource remapping; verify no legacy wrapper is silently accepted (verified by the custom/import suites, Research Product suite, and bundle 47: 27 passing, including canonical six-payload round-trip, explicit legacy preview/confirm, and missing HTML/embedded-image source rejection)
- [x] 3.3 Align TS contract, Synthesis Application, repository boundary, and Rust sidecar with the closed Source Reference/Citation shape and one Application projection owner; verify live/cold reads and stale-basis behavior (verified by focused TS contracts 270–274, Synthesis host suites 121/122/149/178, and nightly Rust workspace tests)
- [x] 3.4 Reconcile the pinned `literature-analysis` upstream renderer/schema and obtain the affected sidecar/runtime build evidence; verify the exact pin and build identity are recorded, or leave the task open with the concrete blocker (upstream skill/literature-analysis and the staged submodule gitlink are verified at 5748a71ed2acb6614c071e0ddc81a6ad6bcf969c; local sidecar build evidence is recorded)
- [x] 3.5 Update Workbench, bundle, import/export, and Synthesis contract tests for function category versus `role_in_context`, mention evidence retention, ID retention/allocation, basis recomputation, and 1 MiB/50 KiB boundary behavior (verified by the 47 focused TS tests and related Workbench/bundle suites)

## 4. Migration-only classifier and converter

- [x] 4.1 Implement the pure shared legacy classifier/converter for note and file/bundle inputs; verify the allowed evidence order, normalization set, deterministic unresolved/review/blocked outcomes, zero-drop gate, and no fuzzy/model matching
- [x] 4.2 Implement citation snapshot recovery with fresh opaque IDs and explicit recovery evidence; verify insufficient snapshots are unresolved and contradictory snapshots are blocked
- [x] 4.3 Implement runtime-owned scan plans bound to one library with `ready`, `review_required`, and `blocked` set classifications; verify parent-set pairing, read-only-library blocking, and bounded preview facts
- [x] 4.4 Implement apply validation and same-transaction parent-set commits, including changed-since-scan no-write, canonical verification before cleanup, visible HTML preservation, and Trash-only cleanup; verify cleanup failure yields `repair_required` without losing canonical data
- [x] 4.5 Add private durable SQLite run/set records for migration ID, definition version, refs, basis hash, classification, outcome, timestamps, counts, and bounded diagnostics; verify one receipt per set and no full payload/hidden backup storage (verified by migration 264: 16 passing, including durable-row assertions that expose only basisHash and never raw HTML/full artifact content)
- [x] 4.6 Implement process single-flight, shared active snapshots, stop-at-set, terminal outcomes, interrupted-run reconciliation, continue-as-new-operation, exact definition-version checks, and restart-required fresh scan; verify no automatic replay or worker reservation
- [x] 4.7 Reuse the same converter for recognized legacy note/file/bundle import with explicit preview and confirmation; verify canonical input uses the normal importer, unknown/damaged input fails closed, and Citation-only input without canonical References is blocked (validated by migration 264: 16 passing and bundle 47: 27 passing, including canonical product import, canceled/damaged bundle, shared-source-note conversion, source-aware duplicate blocking, and unsupported managed-payload blocking)

## 5. Dashboard Migrations surface

- [x] 5.1 Add the permanent Migrations navigation entry after Runtime Logs and a Preact MigrationsRegion using the PR40 page-region foundation; verify empty and unavailable entries remain visible and unrelated regions keep identity
- [x] 5.2 Add Dashboard-local typed projection/actions for scan, apply, stop, continue, preview, receipts, history, and deep-link observation; verify UI submits only runtime-issued scan/candidate references and cannot construct artifacts or plans
- [x] 5.3 Add bounded progress, attention, recovery, cleanup-repair, busy, interrupted, and stale-plan views plus required locale/read-only harness projections; verify no raw HTML, paths, native IDs, or full payload copies cross the UI boundary
- [x] 5.4 Add focused Dashboard/UI tests for navigation-only behavior, multi-window single-flight, explicit confirmation, stop-at-set, restart fresh-scan, bounded history, and region-level render stability; verify no open/select/deep-link path scans or writes

## 6. Deletion, documentation, and governed surfaces

- [x] 6.1 Remove DEL-15 `debug-migrate-note-payloads` workflow and entry only after Dashboard migration has the equivalent executable path; verify no production or catalog caller remains
- [x] 6.2 Update Broker SSOT, Workflow/Synthesis/note/import/bundle/migration documentation, built-in workflow/skill contracts, and affected tests to describe current ownership without claiming unfinished implementation (verified by the Broker/AGENTS constraints, Workflow/note-payload/import/bundle/migration docs, built-in manifest and workflow changes, and the focused consumer suites; unfinished upstream pin/build work remains explicitly open in 3.4)
- [x] 6.3 Audit all managed-note/reference consumers listed in the guide (`getNoteDetail`, `listNotePayloads`, `getNotePayload`, `notes.create`, `notes.updateContent`, `notes.upsertPayload`) and verify unmigrated consumers, legacy producers, duplicate Host acquisition, and unauthorized promotion/dedupe are zero before deleting remaining aliases
- [x] 6.4 Update only approved semantic sources for affected governed surfaces, then run the approved English render, semantic, content, and depth checks; unmapped, downgraded, unauthorized dropped, and intra-package duplicate counts are zero. The user-directed Chinese review mirror is deferred from this round and is not a completion blocker.

## 7. Verification and handoff

- [x] 7.1 Run the smallest affected Broker, managed-note, migration, bundle, Workbench, Dashboard, TS, and Rust suites; record every unavailable native/upstream/sidecar check with its reason and uncovered behavior
- [x] 7.2 Run the project's official OpenSpec verify-change workflow against implementation, specs, and tasks; verify the implementation does not claim completion for unchecked tasks
- [x] 7.3 Run `openspec validate canonicalize-managed-literature-artifacts --type change --strict` and resolve every structural or scenario error before requesting implementation review
- [x] 7.4 Keep the change unarchived until implementation, upstream pin, sidecar evidence, governed-surface review, and required user authorization are complete; verify no main spec or generated surface was edited by this planning change

