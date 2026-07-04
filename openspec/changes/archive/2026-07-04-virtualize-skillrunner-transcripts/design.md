## Context

ACP Skills already renders long transcripts through the shared assistant
transcript renderer using backend-provided pages. SkillRunner has a different
data model: the host still publishes a complete run transcript snapshot, and
that model is useful because SkillRunner runs are tied to live run/session
state rather than a file-backed pageable transcript store.

The shared renderer already owns variable-height virtualization, scroll
anchoring, spacer calculation, and page request deduplication. Reusing that
renderer for SkillRunner avoids a second virtualizer while keeping the
SkillRunner host model unchanged.

## Goals / Non-Goals

**Goals:**

- Let the shared transcript renderer virtualize complete item arrays as an
  item-source mode.
- Keep ACP Skills page-source virtualization behavior unchanged.
- Make SkillRunner run dialog opt into the shared virtualized renderer when the
  existing transcript virtualization preference is enabled.
- Reset virtual renderer state when the visible SkillRunner request/task context
  changes.

**Non-Goals:**

- Do not add backend paging to SkillRunner transcript snapshots.
- Do not add SkillRunner `load-transcript-page` actions.
- Do not connect ACP Chat to backend transcript paging in this change.
- Do not change SkillRunner transcript ownership or publication semantics.

## Decisions

### Use one renderer with explicit source modes

The shared transcript renderer keeps its existing page-source path and adds an
items-source path. Page-source mode continues to merge pages by cursor and may
request missing pages. Items-source mode treats the incoming item array as a
single synthetic page at cursor `0`, with `total` equal to the item count.

Alternative considered: add a SkillRunner-only virtualizer in `run-dialog.js`.
That would duplicate row measurement, anchor restoration, spacer sizing, and
scroll request handling. It would also make future transcript rendering fixes
land in two places.

### Keep SkillRunner host snapshots complete

SkillRunner continues to publish complete transcript snapshots and a
`transcriptRevision`. The browser child passes those items to the shared
renderer with `virtualized: true`, a stable context `pageKey`, and the
snapshot revision.

Alternative considered: introduce SkillRunner transcript paging in the host.
That does not fit the current SkillRunner run/session model and would require a
new storage/read path that this change does not need.

### Gate behavior through the existing transcript preference

The existing assistant transcript pagination/virtualization preference remains
the single switch. The SkillRunner workspace snapshot exposes that value to the
child panel, and the child falls back to non-virtualized rendering when the
preference is disabled.

Alternative considered: add a separate SkillRunner-specific preference. That
would make the UI behavior harder to explain and create another settings path
for the same rendering concern.

### Reset virtual state by visible SkillRunner context

The SkillRunner child panel uses the current request id and selected task key as
the virtual renderer context key. When that key changes, it clears transcript
diffing state and asks the shared renderer to reset its virtual state for the
new context.

Alternative considered: rely only on item ids and diffing. That can leave stale
cached virtual rows available to delayed scroll renders after a run/task switch.

## Risks / Trade-offs

- Items-source mode still receives complete SkillRunner transcript arrays. This
  reduces DOM/rendering cost but does not reduce snapshot payload size.
- If a SkillRunner transcript has unstable item ids, virtualization can still
  render correctly by index, but diff reuse and row-height reuse become less
  effective.
- The shared preference label now covers two behaviors: ACP Skills uses
  paginated virtualization; SkillRunner uses item-source virtualization. The
  locale help text must describe both without implying ACP Chat is migrated.

## Migration Plan

No data migration is required. Existing SkillRunner snapshots remain compatible.
Rolling back this change means removing the child-panel virtualized options and
the snapshot preference field; the renderer page-source path remains the ACP
Skills baseline either way.

## Open Questions

- None for this change. ACP Chat backend pagination and publication-path
  filtering are intentionally deferred to a separate change.
