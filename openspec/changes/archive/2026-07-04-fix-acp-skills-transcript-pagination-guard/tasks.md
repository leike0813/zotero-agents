## 1. Store Snapshot Contract

- [x] 1.1 Add ACP Skills snapshot change descriptors and merge support for immediate and delayed emits.
- [x] 1.2 Add selected request getter and annotate request-scoped transcript, run, runtime-options, selection, and archive changes.
- [x] 1.3 Replace full selected transcript projection with bounded `selectedTranscriptPage`.
- [x] 1.4 Remove obsolete full transcript mirror projection paths that are no longer used.

## 2. Assistant Workspace Host Guard

- [x] 2.1 Filter ACP Skills store changes by active tab, selected request id, change kind, and request id.
- [x] 2.2 Add ACP Skills snapshot signature guard while forcing init, tab activation, and user-action snapshots.
- [x] 2.3 Route `load-transcript-page` child actions to bounded ACP Skills snapshot responses.

## 3. Child Pagination And Virtual Rendering

- [x] 3.1 Update ACP Skills panel projection to read `selectedTranscriptPage.items` before legacy transcript fallback.
- [x] 3.2 Add child-local transcript page cache with page merge, request dedupe, run switch reset, and bounded eviction.
- [x] 3.3 Add scroll-triggered previous/next page requests.
- [x] 3.4 Add ACP Skills-local virtual render window and spacer handling without changing the shared transcript renderer API.

## 4. Tests And Verification

- [x] 4.1 Update ACP runtime memory governance tests for bounded selected transcript pages and change descriptors.
- [x] 4.2 Update ACP UI smoke tests for page-driven projection, virtual window bounds, and load-page scroll action.
- [x] 4.3 Run targeted ACP runtime memory governance tests.
- [x] 4.4 Run targeted ACP UI smoke tests.
- [x] 4.5 Run TypeScript type check.
