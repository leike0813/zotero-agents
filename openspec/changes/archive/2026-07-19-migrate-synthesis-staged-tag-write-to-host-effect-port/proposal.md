## Why

Staged Tag promotion still carries Zotero-local numeric parent IDs through Synthesis contracts and storage, then writes tags directly from both the application service and Tag Regulator workflow. Moving the identity upgrade and mutation behind strict Host ports removes that active Host dependency before the Synthesis application is extracted into a sidecar process.

## What Changes

- **BREAKING** Replace staged Tag `parentBindings` numeric item IDs with stable `{ libraryId, itemKey }` references in current contracts, storage payloads, Workbench projections, and Tag Regulator workflow state.
- Add a bounded migration port that resolves legacy numeric bindings and atomically rewrites staged rows before staged Tag operations continue.
- Add a bounded semantic Tag effect port with ensure-present commands, explicit provenance/precondition/permission, and per-effect receipts.
- Route Synthesis staged Tag promotion and Tag Regulator join publishing through the same staged-promotion/effect path; remove direct bound-parent Zotero writes from the service and workflow.
- Inject Zotero migration/effect adapters only in default legacy composition, keep readonly composition Host-write-free, and preserve the public service inventory.

## Capabilities

### New Capabilities

- `synthesis-host-tag-effect-port`: Defines stable staged-parent identity migration and semantic Host Tag effects without exposing Zotero objects, callbacks, raw errors, or unbounded payloads.

### Modified Capabilities

- `synthesis-tag-vocabulary`: Makes stable item references the only current staged parent-binding form and defines guarded legacy-row migration before staged operations.
- `tag-regulator-workflow`: Requires Tag Regulator to stage stable parent references and use Synthesis promotion instead of writing bound parents directly.
- `workflow-execution-seams`: Changes deferred parent-binding identity from numeric item IDs to stable refs while preserving counts and committed backfill semantics.

## Impact

- Affects Synthesis contracts, Tag Vocabulary normalization, staged-row startup reconciliation, service composition, Workbench projection, Tag Regulator hooks, boundary tests, and runtime documentation.
- Reuses the existing `parent_bindings_json` and operation tables; no database schema, dependency, canonical artifact, or public method is added.
- Keeps `128 methods / 1 direct consumer`; Topic mirror, Graph engine extraction, remote sidecar activation, and final full-service consumer removal remain out of scope.
