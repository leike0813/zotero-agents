## Why

All production Synthesis consumers now use `SynthesisClient`, but the in-process application still obtains Zotero library metadata and artifact payloads through one broad `SynthesisLibraryAdapter`. That adapter mixes unbounded whole-library arrays, Zotero objects, payload decoding, derived graph inputs, and application projections. The service also retains scattered direct Zotero item reads. This boundary cannot be transported to the planned Node sidecar safely.

## What Changes

- Add environment-neutral reverse Host read contracts for paged library metadata, bounded item lookup, hash-first artifact scanning, and locator-based artifact reads.
- Replace `SynthesisLibraryAdapter` with a Zotero Host adapter and a readonly harness adapter that implement the same bounded contract.
- Route Synthesis read/query paths through the Host port, derive application projections inside the service, and remove function-valued Zotero item fallback from workflow apply inputs.
- Make reference-sidecar refresh scan hashes first and read payloads only for changed references and their citation-analysis companions.
- Move default legacy service construction and invalidation into the single client composition root while retaining the current in-process owner.
- Preserve the 128-method public service surface and its single complete-service consumer.

## Capabilities

### New Capabilities

- `synthesis-host-library-read-port`: Defines bounded, cursor-based library metadata and stable-ref lookup from the Synthesis application to the plugin Host.
- `synthesis-host-artifact-read-port`: Defines hash-first artifact descriptor scanning and opaque-locator payload reads without exposing Zotero objects or local paths.

### Modified Capabilities

None.

## Impact

The change affects shared contracts, Zotero and readonly Host adapters, Synthesis application read composition, reference refresh, workflow apply normalization, boundary tests, and current-state documentation. It does not add a process or transport, change database or canonical-file ownership, migrate Host writes, change public client methods, or alter the 128-method service inventory.
