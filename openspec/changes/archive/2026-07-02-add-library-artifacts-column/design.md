## Context

Zotero 7 item trees support plugin-defined custom columns through
`Zotero.ItemTreeManager.registerColumn()`. This change uses that extension point
to add an `Artifacts` column for top-level library items. The column is hidden by
default and only becomes visible when users enable it from Zotero's column
picker.

The column is rendered by Zotero's item tree, so its data provider must remain
synchronous and cheap. Zotero may ask for cell data repeatedly while scrolling,
sorting, resizing, or refreshing the tree. Full Synthesis registry reads,
sidecar reads, payload decoding, or note payload validation are therefore out of
scope for the library column.

The Synthesis Index already has a stronger artifact availability model backed by
registry and sidecar state. That page should continue to represent validated
artifact state, while the Zotero library column represents lightweight local
presence signals.

## Goals / Non-Goals

**Goals:**

- Register a hidden-by-default Zotero library `Artifacts` custom column.
- Show source Markdown, digest, references, and citation-analysis presence using
  compact shared icons.
- Keep library column detection lightweight and safe for dynamic item-tree
  refreshes.
- Reuse `parseNoteKind()` and generated note markers instead of introducing a
  parallel note-title convention.
- Replace Synthesis Index D/R/C text badges with the same icon language while
  preserving registry-backed semantics.

**Non-Goals:**

- Do not add column click actions, settings, or workflow protocol changes.
- Do not validate note payloads, decode payload attachments, or read Synthesis
  storage from the Zotero library column.
- Do not change Synthesis Index artifact availability semantics.
- Do not infer digest, references, or citation-analysis artifacts from note
  titles.

## Decisions

### Use a Zotero custom item-tree column

The library surface is implemented with `Zotero.ItemTreeManager.registerColumn()`
using the stable data key `artifacts`. This keeps the feature inside Zotero's
native column picker and avoids custom overlays on the item tree.

Alternative considered: render icons through an independent pane or overlay.
That would avoid item-tree column sizing constraints, but it would not behave
like a first-class Zotero column and would add more layout coupling.

### Keep the column hidden by default

The column does not set `defaultIn`. Users opt in through Zotero's column picker.
This avoids surprising users with a new narrow icon column in existing library
layouts.

Alternative considered: show the column by default in the main tree. That would
increase discoverability but would also change existing library layouts
immediately on plugin update.

### Use synchronous cached data with asynchronous scans

The `dataProvider` returns the cached state synchronously. If a top-level regular
item is uncached, it starts one background scan and immediately returns empty
data. Scan completion updates the cache and debounces
`Zotero.ItemTreeManager.refreshColumns()`.

This matches Zotero item-tree refresh behavior: cell data can be requested
frequently, so the hot path must not await attachment or note inspection.

Alternative considered: make all detection eager during startup or notification
handling. That would move work out of rendering but would scan more items than
the user actually views.

### Separate lightweight library presence from validated Synthesis state

The library column only checks for directly observable artifacts under the
parent item:

- Source Markdown: best PDF attachment filename stem matches an attached `.md`
  or `.markdown` file, case-insensitively.
- Digest, references, citation analysis: direct child note HTML carries a
  generated marker recognized by `parseNoteKind()` or the supported
  payload-anchor marker.

The Synthesis Index remains registry-backed. It shows icons based on artifact
coverage/status already written into Synthesis data.

Alternative considered: reuse Synthesis registry state for both surfaces. That
would make semantics identical, but it would make the library column depend on
Synthesis storage and payload validation during a high-frequency Zotero UI path.

### Reuse note marker parsing instead of title matching

Generated notes are classified through `parseNoteKind()` and generated
payload-anchor markers. This keeps note-kind recognition tied to the existing
note payload codec and avoids a second convention based on mutable user-visible
titles.

Alternative considered: detect notes by title. That would be cheap, but it would
create false positives and would break if users rename generated notes.

### Use a shared bundled SVG icon set

Four bundled SVGs are the single visual source for source Markdown, digest,
references, and citation-analysis artifacts. The Zotero library column and
Synthesis Index reference the same files. Missing Synthesis Index artifacts use
the same icon shape with muted styling instead of falling back to text badges.

Alternative considered: keep the existing Markdown reader PNG and text D/R/C
badges. That would reduce new assets, but it would leave the two surfaces with
inconsistent artifact language.

## Risks / Trade-offs

- [Risk] Zotero item-tree custom cell layout can affect column alignment.
  -> Mitigation: render a cell-compatible wrapper, avoid dynamic dimensions, and
  keep icon sizes fixed.
- [Risk] The library column may briefly show no icon before an asynchronous scan
  completes.
  -> Mitigation: cache scan results and debounce column refreshes so the state
  fills in without blocking tree rendering.
- [Risk] Lightweight note-marker detection can disagree with Synthesis Index
  registry state.
  -> Mitigation: treat the two surfaces as intentionally different contracts:
  library column means "local generated note marker exists"; Index means
  "validated registry artifact exists".
- [Risk] Attachment filename matching may miss source Markdown files whose names
  do not share the best PDF stem.
  -> Mitigation: keep the spike rule simple and deterministic; broaden matching
  only after observing real library cases.
- [Risk] Locale or icon keys can drift across browser and Zotero surfaces.
  -> Mitigation: keep icon filenames centralized in the rendering definitions
  and rely on localization governance for Synthesis Workbench message keys.

## Migration Plan

1. Register the column during plugin startup and unregister the returned data key
   on shutdown.
2. Preserve hidden-by-default behavior so existing Zotero item-tree layouts do
   not change until users enable the column.
3. Ship the bundled SVG icon set with the plugin static assets.
4. Replace Synthesis Index text badges with icon rendering while keeping the
   existing registry/sidecar inputs unchanged.
5. If the column causes Zotero layout regressions, disable or adjust only the
   column renderer; no data migration or registry rollback is required.

## Open Questions

- Should the library column eventually support click actions, such as opening
  the source Markdown attachment or generated note?
- Should source Markdown matching expand beyond same-stem best-PDF matching?
- Should a future settings surface let users choose which artifact icons appear
  in the library column?
