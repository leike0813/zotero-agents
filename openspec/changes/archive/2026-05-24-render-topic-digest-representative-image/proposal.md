# Change: Render Topic Digest Representative Image

## Why

Literature digest notes can now contain a Host-managed representative image block.
The topic detail source digest modal currently renders only the canonical
`digest-markdown` payload, so users cannot inspect the representative image from
the topic evidence view.

## What Changes

- Extend the topic paper digest resolver with an opt-in representative image DTO
  for workbench rendering.
- Parse the representative image block from the digest note HTML and resolve only
  note-child embedded-image attachments.
- Render the image above the digest markdown in the source digest modal with a
  compact, bounded layout.
- Keep image resolution best-effort: image failures must not affect digest
  markdown availability.

## Impact

- Affected specs: `topic-synthesis-detail-ui`
- Affected code:
  - `src/modules/synthesis/service.ts`
  - `src/modules/synthesis/digestRepresentativeImage.ts`
  - `src/synthesisWorkbenchApp.ts`
  - `addon/content/synthesis/styles.css`
  - `test/core/125-synthesis-tab-ui.test.ts`
  - `test/core/131-synthesis-layer-mvp.test.ts`
