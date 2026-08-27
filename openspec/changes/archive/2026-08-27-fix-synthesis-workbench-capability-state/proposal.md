## Why

The production Synthesis Workbench had three independent protocol-boundary failures. First, it projected its complete local UI state into a strict sidecar request that accepts only the protocol-owned `WorkbenchState` DTO, which made the initial Chrome read fail with `Synthesis protocol capability request is invalid`. After that request path was repaired, only Index opened: the capability result contract still modeled every surface as one generic projection and rejected the structurally different surface results. Real persisted data then exposed a third fault: Home and Topics decoded historical Topic bundles as the current full Topic record, while Review exposed storage-shaped Concept proposals and unbounded Reference evidence that did not satisfy the public UI DTOs.

## What Changes

- Define the Workbench capability read state as one recursively concrete, protocol-owned DTO shared by Chrome and every surface read.
- Project local `SynthesisUiState` into only the registry, review, reader, and Citation Graph query fields accepted by that DTO.
- Validate projected state through the shared contract builder at both the UI adapter and grouped client boundary, before legacy or native dispatch.
- Keep Graph continuation and expected-basis fields inside the canonical Citation Graph query shape.
- Replace the generic surface result with a closed union of per-surface projections, including one Review variant per active tab, and expose the same mapping through the public TypeScript client contract.
- Validate each result against the definition selected by the original surface request so a valid result for a different page fails before UI projection.
- Align Reader Topic detail, Topic Graph, Concept, Tag, and Citation Graph result fields with the real Rust output, including their existing snake-case and camel-case wire names.
- Project Home and Topics from a lightweight application DTO that reads stable Topic state and readiness without decoding historical full bundle payloads.
- Decode stored Concept Review proposals once in the application layer, accepting the persisted snake-case form while preserving strict typed validation for both review actions and UI reads.
- Replace raw Concept proposal and Reference evidence payloads with closed public Review DTOs; Reference evidence is discriminated by proposal kind and omits persistence-only candidates, representatives, and source records.
- Normalize an absent Concept or Topic Graph manifest to `null` at the public projection instead of exposing an invalid empty hash.
- Make native composition rebuild Workbench results against the originating surface and Review tab immediately after RPC/content transfer resolution.
- Extend contract corpus and client/native/Rust-route coverage so the default Workbench state can open Chrome and every supported surface, while unprojected requests and wrong-surface results are rejected before dispatch or rendering.
- Align the governed native smoke with the shared production launch-config v3 contract, and make platform-sensitive Rust tests synchronize task and concurrent-read completion while releasing Topic and migration SQLite owners before cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workbench-ui-client-consumer`: Require the shared UI adapter to project local UI state into the narrow protocol read state rather than forwarding the complete UI model.
- `synthesis-workbench-read-client`: Require Chrome and surface reads to use one strict request contract and request-selected, recursively concrete result contracts across in-process and native transports.
- `synthesis-native-topic-workbench-surface`: Require the native boundary's real result projection for every Workbench surface and Review tab to satisfy its matching public capability result schema.
- `synthesis-sidecar-prebuild-release`: Require native candidate smoke and platform tests to exercise current production seams deterministically before an archive is accepted.

## Impact

- `packages/synthesis-contracts` Workbench request/result types, per-surface schemas, builders, and cross-language corpus.
- `src/modules/synthesisClient` UI adaptation, grouped client normalization, and native request-aware result rebuilding.
- Rust Synthesis application DTOs and stored Concept proposal decoding, plus production Workbench projection.
- Client foundation, native composition, production Rust-route scenarios, and protocol parity tests.
- Seven-platform smoke configuration and cross-platform Rust test fixtures.
- The governed seven-platform Synthesis sidecar prebuild input changes; no persisted schema/data migration, lifecycle ownership, public operation semantics, formal release, or user-facing Workbench control changes.
