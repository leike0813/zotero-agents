## MODIFIED Requirements

### Requirement: Bootstrap reading structure

The `literature-deep-reading` runtime SHALL expose stable reading blocks that preserve rich paper structures and distinguish main paper content, bibliography content, and appendix content.

#### Scenario: Rich content is parsed into structured blocks

- **GIVEN** source Markdown contains display math, images with captions, and tables with captions
- **WHEN** bootstrap writes `runtime/views/reading-blocks.json`
- **THEN** display math SHALL be represented as `formula` blocks
- **AND** image references with adjacent captions SHALL be represented as `image` blocks
- **AND** tables with adjacent captions SHALL be represented as `table` blocks
- **AND** each structured block SHALL preserve source order and `block_id`.

#### Scenario: Bibliography is outside translation flow but Appendix remains paper content

- **GIVEN** the source contains a References or Bibliography section
- **AND** the source later contains an Appendix, Appendices, Supplementary Material, or appendix-like subsection heading
- **WHEN** bootstrap marks reading blocks
- **THEN** bibliography blocks SHALL have `role: "bibliography"` and `translate: false`
- **AND** appendix blocks SHALL have `role: "appendix"` and `translate: true`
- **AND** normal paper blocks SHALL have `role: "main"`
- **AND** `references-seed-view.json` fallback extraction SHALL exclude appendix text.

### Requirement: Stage 30 SHALL reject invalid block coverage

The runtime SHALL reject translations that do not match the bootstrap block structure.

#### Scenario: Unknown or duplicated block id is submitted

- **GIVEN** `block-translations.json` contains an unknown block id or repeats the same block id
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: Required main or appendix body block is missing

- **GIVEN** a non-formula block has `translate: true`
- **AND** its role is `main` or `appendix`
- **AND** no translation row is submitted for that block
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: Bibliography block is submitted

- **GIVEN** a block has `role: "bibliography"` and `translate: false`
- **AND** the payload contains a translation row for that block
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

### Requirement: Final HTML renderer

The final renderer SHALL render structured blocks into a self-contained reader without escaping valid paper structures and SHALL keep Appendix content readable after References.

#### Scenario: Compare mode aligns source and translation by block

- **GIVEN** `reading-blocks.json` and `translation-view.json` are available
- **WHEN** Stage 40 renders `result/deep-reading.html`
- **THEN** translatable main and appendix body blocks SHALL be rendered as `aligned-block-pair` rows keyed by `block_id`
- **AND** References SHALL be rendered full-width outside the paired reading flow.

#### Scenario: Appendix renders after References

- **GIVEN** bootstrap identified appendix blocks
- **WHEN** Stage 40 renders final sections
- **THEN** `result/sections/sections.json` SHALL contain `reading_blocks` for main content
- **AND** it SHALL contain `appendix_reading_blocks` for appendix content
- **AND** the final HTML order SHALL be Summary, References, Appendix, Citation Graph, then Extensions after the main paper.

#### Scenario: Right reading aid follows scroll position

- **GIVEN** section insights contain Q&A and citation notes
- **WHEN** the reader scrolls through main or appendix sections
- **THEN** the right reading aid SHALL update for the active section
- **AND** questions SHALL appear before citation clues.

### Requirement: References after body SHALL remain full width

References and bibliography content SHALL not enter the bilingual body columns. Appendix content after References SHALL still use the paper reading modes.

#### Scenario: References are rendered

- **GIVEN** structured references exist
- **WHEN** Stage 40 renders HTML
- **THEN** references SHALL be represented in the post-reading data
- **AND** bibliography blocks SHALL not be included in translation compare body blocks.

#### Scenario: Appendix is rendered as paper content

- **GIVEN** appendix blocks exist after the bibliography
- **WHEN** Stage 40 renders HTML
- **THEN** appendix blocks SHALL be rendered after References
- **AND** appendix blocks SHALL participate in original, translated, compare, and focus reading modes.
