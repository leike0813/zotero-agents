## Why

Topic paper-digest representative-image resolution still reaches from the Synthesis application service into Zotero note and attachment objects, local attachment paths, and runtime file reads. Moving that behavior behind a strict Host read port keeps the application boundary environment-neutral while preserving the existing digest UI projection and public service surface.

## What Changes

- Add a bounded, canonical representative-image read contract whose request contains only `libraryId` and `noteKey`, and whose result distinguishes `absent`, `unavailable`, and `available` outcomes.
- Move Zotero note/attachment lookup, parent validation, MIME/path checks, byte reads, base64 encoding, and stable diagnostics into a legacy Host adapter.
- Keep representative-image descriptor parsing and digest UI projection pure and environment-neutral.
- Inject the Host port in default legacy composition, omit it from readonly composition, and treat missing, malformed, or failed Host reads as best-effort image unavailability rather than digest failure.
- Preserve the existing `SynthesisClient.workbench.readPaperDigest` contract, include flag, UI shape, service method inventory, and single direct full-service consumer.

## Capabilities

### New Capabilities

- `synthesis-host-representative-image-read-port`: Defines the strict Host boundary for resolving a topic digest representative image without exposing Zotero objects, note HTML, local paths, callbacks, or unbounded binary content.

### Modified Capabilities

- `topic-synthesis-detail-ui`: Requires representative-image enrichment to remain optional and best-effort when Host image resolution is absent, unavailable, malformed, or fails.

## Impact

- Affects Synthesis contracts, representative-image helpers, the Host adapter layer, `SynthesisService` composition, boundary tests, and Synthesis architecture/runtime documentation.
- Adds no dependency, database migration, canonical artifact change, public method, or UI interaction change.
- Keeps the service inventory at `128 methods / 1 direct consumer` and leaves staged-tag writes, numeric parent bindings, Topic mirror runtime, and final full-service consumer removal out of scope.
