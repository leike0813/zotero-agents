## Context

The original streaming render preference worked because ACP Chat and ACP Skills
had a UI-visible transcript layer separate from the canonical runtime
transcript. The file-backed transcript and selected-page migrations removed or
bypassed that layer: ACP Chat now sends selected pages from durable transcript
reads, while ACP Skills selected pages read the live mirror directly.

The cleaner fix is not to restore the old full published transcript caches. Both
panels already have the right bounded contract: structural panel metadata plus a
selected transcript page. The missing boundary is a shared page projection rule
that decides which canonical mirror items are visible to the UI before paging.

## Decisions

### Use selected-page read-model parity

ACP Chat panel snapshots and page requests read selected pages from the hydrated
conversation mirror, matching ACP Skills. If the mirror is not ready, the panel
snapshot carries the selected transcript loading/failed state and omits
`selectedTranscriptPage`; the child shows the existing spinner or error state.

The durable ACP Chat page reader remains the public file-backed API and recovery
source, but Assistant Workspace selected-page publication uses the active mirror
read-model.

### Project UI-visible transcript items before paging

Both ACP Chat and ACP Skills apply the same projection before cursor slicing:

- streaming enabled: all canonical mirror items may be visible;
- streaming disabled: message/thought items whose state is `streaming` are
  hidden;
- structural items such as tools, status, plan, and permission remain visible.

Because projection happens before paging, `cursor`, `prevCursor`, `nextCursor`,
and `total` describe the UI-visible item list rather than a durable page with
rows removed after the fact.

### Let the host refresh filter own streaming policy

ACP Chat typed panel changes include `transcript-append` and
`transcript-boundary`. Active append changes refresh only when streaming render
is enabled. Boundary and chrome changes refresh regardless of the preference.
ACP Skills keeps its existing typed change model, while selected page projection
prevents side-channel structural refreshes from leaking hidden text.

### Keep child renderers as consumers

ACP Chat and ACP Skills children continue to validate scope, reset virtual state
on scope changes, and pass selected pages into the shared transcript renderer.
The child layer does not hide streaming text; it renders the page selected by
the host read-model.

## Risks / Trade-offs

- Reading ACP Chat pages from the mirror means page requests wait for hydrate
  readiness instead of falling back to durable page reads. This matches ACP
  Skills and gives correct loading spinners, but makes explicit hydration state
  part of the panel contract.
- UI-visible paging can produce different cursor totals from the durable
  transcript when streaming render is disabled. That is intentional: the page
  describes what the user can see.
- The streaming preference remains global. Per-panel or per-backend policies are
  out of scope.

## Migration Plan

No data migration is required. Existing transcript JSONL files and indexes
remain canonical. The change is limited to read-model projection and host
refresh policy.

## Open Questions

None.
