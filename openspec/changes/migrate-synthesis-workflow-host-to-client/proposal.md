## Why

The workflow host still exposes the complete 126-method in-process Synthesis service, and its types directly import that legacy implementation. This prevents a remote-capable client replacement and allows custom workflows to couple to repository, UI, and host-effect internals.

## What Changes

- **BREAKING** Narrow `hostApi.synthesis` from `SynthesisService` to the twelve workflow capabilities currently used or intentionally exposed by the workflow host.
- Add environment-neutral workflow apply, Topic report, paper artifact, Tag Vocabulary, staged suggestion, and tag-audit DTOs to `synthesis-contracts`.
- Route the synchronous workflow host facade through lazy grouped `SynthesisClient` capabilities without importing the legacy service.
- Convert live Zotero items to bounded JSON-safe snapshots before digest apply.
- Materialize Topic apply run-workspace artifacts into bounded controlled asset identifiers before crossing the client boundary; no functions, absolute paths, or live host objects cross it.
- Extend the migration-time in-process adapter to reconstruct the legacy read-only bundle reader and preserve current observable behavior.
- Remove workflow host/types from the legacy service consumer inventory, reducing the direct consumer count from seven to five.
- Update active workflow host documentation to describe the implemented narrow API.

## Capabilities

### New Capabilities

- `synthesis-workflow-client`: Defines the narrow workflow Synthesis facade, environment-neutral grouped client DTOs, Topic asset materialization, lazy in-process routing, and stable failure behavior.

### Modified Capabilities

None. Production execution and storage ownership remain in-process.

## Impact

- `packages/synthesis-contracts` grouped client interfaces and DTO ownership.
- Plugin-side Synthesis client composition, in-process adapter, and workflow input/materialization adapters.
- `src/workflows/hostApi.ts`, `src/workflows/types.ts`, workflow API documentation, migration inventory, and boundary tests.
- Current workflows retain the twelve named methods; other legacy service methods are no longer exposed through `hostApi.synthesis`.
