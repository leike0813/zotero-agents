# literature-deep-reading-skill Delta

## MODIFIED Requirements

### Requirement: Bootstrap reading structure

The `literature-deep-reading` runtime SHALL expose stable reading blocks that preserve rich paper structures.

#### Scenario: Rich content is parsed into structured blocks

- **GIVEN** source Markdown contains display math, images with captions, and tables with captions
- **WHEN** bootstrap writes `runtime/views/reading-blocks.json`
- **THEN** display math SHALL be represented as `formula` blocks
- **AND** image references with adjacent captions SHALL be represented as `image` blocks
- **AND** tables with adjacent captions SHALL be represented as `table` blocks
- **AND** each structured block SHALL preserve source order and `block_id`.

#### Scenario: References remain outside translation flow

- **GIVEN** the source contains a References section
- **WHEN** bootstrap marks reading blocks
- **THEN** References and later blocks SHALL have `translate: false`.

### Requirement: Block translation normalization

The runtime SHALL validate translations according to each reading block's structure without changing the agent-facing payload fields.

#### Scenario: Formula blocks are carried over

- **GIVEN** a translatable display formula block has no submitted translation
- **WHEN** Stage 30 normalizes translations
- **THEN** it SHALL carry over the source formula.

#### Scenario: Table translations remain table-like

- **GIVEN** a table block translation is submitted
- **WHEN** Stage 30 validates the payload
- **THEN** the translation SHALL keep a table-like body
- **AND** it SHALL NOT wrap the table in unrelated explanatory prose.

#### Scenario: Image translations preserve image references

- **GIVEN** an image block translation is submitted
- **WHEN** Stage 30 validates the payload
- **THEN** the translation SHALL preserve the source image references.

### Requirement: Final HTML renderer

The final renderer SHALL render structured blocks into a self-contained reader without escaping valid paper structures.

#### Scenario: Math is locally pre-rendered

- **GIVEN** source or translated blocks contain inline or display LaTeX
- **WHEN** Stage 40 renders `result/deep-reading.html`
- **THEN** math SHALL be rendered with local HTML/MathML output when possible
- **AND** the final HTML SHALL NOT reference remote math assets.

#### Scenario: Translated tables render as tables

- **GIVEN** a table block translation contains valid HTML or Markdown table content
- **WHEN** Stage 40 renders compare mode data
- **THEN** the translation HTML SHALL contain a rendered table rather than escaped table markup.

### Requirement: Reference digest context

The runtime SHALL expose digest browsing for references that are bound to library papers.

#### Scenario: Library reference digests are collected

- **GIVEN** `reference-index get` returns reference rows with `target_binding: "library"` and `target_paper_ref`
- **WHEN** Stage 10 processes `reference_digest_policy: "all_library_references"`
- **THEN** it SHALL export digest artifacts for those target paper refs
- **AND** Stage 20 SHALL mark corresponding structured references with available digest modal data.

### Requirement: Digest-based Summary

The Summary view SHALL avoid reproducing digest per-section summaries.

#### Scenario: Digest summary keeps only leading sections

- **GIVEN** `artifacts/digest.md` contains more than five top-level `##` sections
- **WHEN** Stage 20 builds `summary-view.json`
- **THEN** it SHALL include only the first five top-level sections.
