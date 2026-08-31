## Why

The seven completed Workflow Host v12 prerequisite slices leave eight frozen leaf modules without complete production owners: `addon`, `environment`, `images`, `bibliography`, `clipboard`, `editor`, `notifications`, and `logging`. Atomic v12 activation must remain blocked until these contracts are implementation-ready behind the active v11 facade, especially the managed prepared-image lifecycle and bibliography renderer that the prerequisite audit found absent.

The fixed architecture baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§3.7, 11.8–11.9, 12.10–12.11, 14.1–14.5, 15.1, and 17–19.

## What Changes

- Complete the `addon` identity owner and add a late-bound, closed `environment` reader without publishing v12 identity early.
- Replace the legacy note-image result with a workflow-run-scoped prepared-image registry, opaque refs, bounded portable sources, metadata, automatic cleanup, and note-operation consumption.
- Establish a bibliography deep module with stable format refs, runtime availability, ordered caller-declared fallback, strict options, portable item refs, cancellation, and bounded complete output.
- Add a bounded plain-text clipboard owner with interactive and non-interactive adapters.
- Refactor the editor owner from a public renderer registry to inline session-owned renderers while retaining sequential session behavior.
- Project workflow toast requests through the existing notification owner with validation, caller-scoped visible limits, and non-interactive denial.
- Add a workflow-facing logging adapter that binds trusted run identity, validates bounded strict-JSON input, and sanitizes before the existing runtime log pipeline.
- Keep all eight owners staged behind v11; the exact v12 manifest, version switch, package guard, consumer migration, and legacy deletion remain in `harden-workflow-host-api-v12`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-contract`: Define staged owner contracts for addon identity, late-bound environment facts, and bounded clipboard interaction without changing the active Host version.
- `workflow-execution-seams`: Bind prepared resources and caller-scoped Host adapters to trusted execution ownership and terminal lifecycle without widening runtime hook injection.
- `zotero-host-capability-broker`: Give prepared images and bibliography native Zotero semantics explicit deep-module owners without widening projections implicitly.
- `zotero-host-broker-capability-api`: Replace legacy image/export shapes with portable prepared-image and bibliography contracts, stable errors, bounds, and cancellation.
- `custom-note-import-export`: Bind embedded-image content writes to opaque prepared-image refs and the canonical note mutation lifecycle.
- `workflow-editor-host`: Move renderer ownership into each bounded editor session and remove the public renderer registry contract.
- `workflow-execution-notifications`: Add validated, caller-scoped workflow toast projection and non-interactive behavior to the existing notification owner.
- `runtime-log-pipeline`: Add the bounded workflow log request adapter while keeping trusted identity and sanitization inside the Host.

## Impact

- Contract and composition preparation: `src/workflows/types.ts`, `src/workflows/hostApi.ts`, and focused owner factories; no change to `WORKFLOW_HOST_API_VERSION` or the production v11 shape.
- Prepared images and notes: `src/workflows/workflowNoteImagePreparation.ts`, a dedicated run-scoped registry/owner seam, note content adapters, and lifecycle cleanup wiring.
- Bibliography: the existing Zotero text-export translator seam, Broker composition, and Research Bundle consumption without duplicating translator policy.
- UI/observability leaves: addon/environment, clipboard, editor, notification, and workflow logging adapters plus their existing deep modules.
- Tests: focused Node/UI owner tests, fail-closed adapters, run cleanup and hard-limit cases, exact DTO validation, and v11 non-activation governance.
- No dependency, persisted-data migration, Host Bridge/MCP exposure, release, generated help-doc edit, version activation, built-in consumer cutover, or approved legacy deletion.
