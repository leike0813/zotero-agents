# literature-deep-reading-skill Delta

## MODIFIED Requirements

### Requirement: Final HTML renderer

The `literature-deep-reading` skill SHALL render a self-contained deep-reading HTML using the reviewed seamless reader behavior.

#### Scenario: Compare mode aligns source and translation by block

- **GIVEN** `reading-blocks.json` and `translation-view.json` are available
- **WHEN** Stage 40 renders `result/deep-reading.html`
- **THEN** translatable body blocks before References SHALL be rendered as `aligned-block-pair` rows keyed by `block_id`
- **AND** References and later sections SHALL be rendered full-width outside the paired reading flow.

#### Scenario: Right reading aid follows scroll position

- **GIVEN** section insights contain Q&A and citation notes
- **WHEN** the reader scrolls through body sections
- **THEN** the right reading aid SHALL update for the active section
- **AND** questions SHALL appear before citation clues.

#### Scenario: Final HTML does not depend on external math rendering

- **GIVEN** source or translated blocks contain inline or display LaTeX
- **WHEN** Stage 40 renders the final HTML
- **THEN** math content SHALL be emitted as local rendered HTML wrappers
- **AND** the HTML SHALL NOT reference CDN math assets.

#### Scenario: Citation graph uses host layout coordinates

- **GIVEN** citation graph snapshot and layout views are available
- **WHEN** Stage 40 renders the citation graph
- **THEN** graph nodes SHALL be positioned from the layout view
- **AND** browser code SHALL NOT compute a replacement force layout.

#### Scenario: Structured references replace Markdown fallback when available

- **GIVEN** `artifacts/references.json` is available in the source bundle
- **WHEN** Stage 20 and Stage 40 render references
- **THEN** the References section SHALL use structured reference entries rather than raw Markdown text.

#### Scenario: Empty image files do not produce empty data URIs

- **GIVEN** an image file in the source bundle has zero bytes
- **WHEN** Stage 40 builds source image data
- **THEN** the image SHALL be marked corrupt or missing
- **AND** no `data:image/...;base64,` URI SHALL be generated for that file.
