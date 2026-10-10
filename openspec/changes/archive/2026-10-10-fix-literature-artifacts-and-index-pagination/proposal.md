## Why

The confirmed Joshua-Side diagnosis identifies conversion errors that reject valid empty References and turn full Citation reports into oversized summaries, transient Artifacts column failures that remain cached as absence, and an Index window limit that hides sources after the first 100 items. Blocking conversion evidence is also lost before it reaches receipts.

## What Changes

- Preserve References source validity independently of its entry count; use only the summary field for Citation summaries and retain bounded validation evidence in receipts.
- Advance migration definition version to 8 so the corrected conversion rules can be scanned again.
- Keep successful column values across transient failures, retry at 1/2/4 seconds, invalidate on ordinary refresh, and reject stale scan completions.
- Expose all Index sources through 100-parent windows with progressive 25-source reads, previous/next navigation, basis-bound continuation and bounded first-window session caching.
- Display accurate library totals; keep referenced-scope totals unknown and label search/filter behavior as current-window-only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-artifact-migration`: empty-source semantics, summary conversion and bounded receipt evidence.
- `zotero-library-artifacts-column`: canonical readiness evidence, retry, refresh invalidation and scan ownership.
- `synthesis-workbench`: complete traversal through bounded Index windows and scope-correct totals.
- `synthesis-workbench-ui`: window navigation and window-local filtering.
- `synthesis-workbench-ui-client-consumer`: first-window cache reuse and live cursor ownership.
- `synthesis-reference-sidecar-index`: Host source totals remain separate from sidecar readiness and referenced match counts.

## Impact

Updates shared conversion, column notification handling, Workbench host/page contracts, TypeScript/Rust Host page DTOs, protocol schema/corpus, existing regression tests and documentation. Canonical artifact schemas and storage layouts remain unchanged. Production library data and historical migration receipts are outside implementation scope.
