# Change: Fix Literature Deep Reading Structured Rendering and Reference Context

## Summary

Repair `literature-deep-reading` output by making the bootstrap reading blocks structurally meaningful, rendering local math and tables correctly, collecting digest artifacts for library-bound references, and trimming digest-based Summary output before per-section summaries.

## Motivation

Recent ACP runs show the final HTML is now broadly functional, but several reader-facing surfaces still fail because the runtime treats rich paper content as plain paragraphs. Display formulae are not truly pre-rendered, translated HTML tables can be escaped, figure/table captions are not stable units, library references do not expose digest modals, and Summary repeats digest section-by-section notes that belong in the digest artifact rather than the deep-reading closeout.

## Scope

- Structure bootstrap reading blocks for formulae, images with captions, and tables with captions.
- Keep existing agent-facing payload fields while enforcing structure by block kind.
- Add skill runtime math rendering dependency and local MathML rendering fallback behavior.
- Normalize Host reference-index rows into library-bound references and collect digest markdown for them.
- Trim digest-based Summary to the first five top-level digest sections.

## Out of Scope

- No topic lookup deleted-filter work.
- No new workflow or skill stage.
- No new agent-facing payload fields.
- No CDN or runtime Host dependency in the final HTML.
