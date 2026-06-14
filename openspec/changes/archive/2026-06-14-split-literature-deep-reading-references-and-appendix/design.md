# Design

## Context

The runtime currently marks every block after a References/Bibliography heading as non-translatable. Stage 40 then omits those blocks from the bilingual reading flow and renders References as post-reading content.

That rule conflates two different document regions:

- bibliography/reference list: metadata-like backmatter that should remain full width and normally should not be translated;
- appendix/supplementary material: paper content that can contain methods, experiments, proofs, tables, and figures, and should remain readable.

## Goals

- Distinguish bibliography from appendix in runtime views.
- Translate and render Appendix/Supplementary Material as paper content.
- Keep structured References full width and outside bilingual paired blocks.
- Preserve all existing agent-facing payload fields.
- Keep old no-appendix papers visually unchanged.

## Non-Goals

- Perfect publisher-specific backmatter classification.
- Workflow/source-bundle changes.
- Reordering Summary after Appendix.
- Requiring old completed runs to recover appendix translations through Stage 40 alone.

## Decisions

### Section And Block Roles

Bootstrap SHALL assign each section and reading block a `role`:

- `main`: normal paper content before bibliography or appendix;
- `bibliography`: References/Bibliography/reference-list content;
- `appendix`: Appendix, Appendices, Supplementary Material, or appendix-like subsections after a bibliography.

The role is a runtime-derived field in views and persistence. The agent does not write it.

### Role State Machine

Parsing starts in `main`.

When a heading matches References/Bibliography/参考文献, the parser enters `bibliography`. Blocks in that section have `translate: false`.

When a heading matches Appendix/Appendices/Supplementary Material/附录, the parser enters `appendix`. Blocks in that section have `translate: true`.

After a bibliography has been seen, appendix-like letter headings such as `A`, `A.1`, `B.1.1`, or `Appendix A` MAY enter `appendix`. This heuristic only applies after bibliography or after appendix mode has already started, reducing false positives in the main paper.

If an unusual document contains a second References heading inside appendix, that section is treated as `bibliography`.

### Translation Coverage

Stage 30 SHALL require translations for all `translate: true` blocks in `main` and `appendix`, except formula blocks that can be carried over.

Stage 30 SHALL reject bibliography blocks in `block-translations.json` exactly as it currently rejects non-translatable blocks.

### References Fallback

`references-seed-view.json` SHALL only consume `bibliography` blocks when structured references artifact data is unavailable. Appendix blocks must never be parsed as fallback references.

### Final Rendering

Stage 40 SHALL split rendered reading blocks into:

- `reading_blocks` for `main`;
- `appendix_reading_blocks` for `appendix`.

The final HTML SHALL render Summary after Main Paper and before References. Appendix renders after References and before Citation Graph/Extensions.

Appendix uses the same original/translated/compare/focus modes as the main paper. References remain full-width in every reading mode.

### Compatibility

Existing runs generated before this change may not contain appendix translations. They should be rerun from bootstrap or at least from Stage 30 to produce complete Appendix output.

Runs without Appendix should preserve current output order and behavior.

## Risks

- Some documents use lettered headings after References for non-appendix content. The heuristic is intentionally scoped to after-bibliography or existing appendix mode.
- Old run folders cannot be repaired by re-rendering if translation data was never produced.
- Browser tests should assert stable structure and mode behavior, not exact pixel layout or full text snapshots.
