## ADDED Requirements

### Requirement: Runtime-prepared translation batches

The `literature-deep-reading` skill runtime SHALL prepare deterministic translation batch inputs before the agent writes `block-translations.json`.

#### Scenario: Enrichment cascades translation batch preparation

- **WHEN** `submit-reading-enrichment` succeeds
- **THEN** the runtime SHALL write `runtime/views/translation-batches-view.json`
- **AND** the runtime SHALL write one or more `runtime/payloads/translation-batches/batch-*.json` files when translatable blocks exist
- **AND** each `translate: true` main or appendix block SHALL appear in exactly one batch
- **AND** bibliography/reference-list blocks SHALL NOT appear in any batch

#### Scenario: Batch files are subagent-ready

- **WHEN** a batch file is generated
- **THEN** it SHALL include ordered block ids, source markdown, block kind, section anchor, target language, and a translation prompt
- **AND** the prompt SHALL require full faithful translation, Markdown preservation, formula preservation, table text translation, table structure preservation, and no summarization

### Requirement: Runtime stdout remains small

Runtime commands SHALL return small JSON summaries on stdout and write large content to files.

#### Scenario: Submit commands produce summary output

- **WHEN** a submit or validate command completes
- **THEN** stdout SHALL include status, counts, diagnostics summary, and relevant output paths
- **AND** stdout SHALL NOT include large paper content, full reading blocks, full translation views, full graph models, or HTML content

### Requirement: Stable Preface slots

The runtime SHALL normalize Preface output to a fixed four-card structure.

#### Scenario: Agent submits variable Preface cards

- **WHEN** `reading-enrichment.json` contains any number of `preface_cards`
- **THEN** `preface-view.json.cards` SHALL contain exactly four cards
- **AND** the cards SHALL be ordered as research field, research direction, paper position, and reading path
- **AND** extra agent cards SHALL NOT change the final card count or order

### Requirement: Citation graph render diagnostics

The final renderer SHALL expose citation graph render readiness and diagnostics.

#### Scenario: Graph model and layout are available

- **WHEN** Stage 40 builds final sections with a citation graph snapshot and layout
- **THEN** `sections.json.citation_graph.model.diagnostics` SHALL include snapshot counts, layout counts, drawable node count, drawable edge count, dropped counts, coordinate bounds, and layout status
- **AND** the final HTML SHALL initialize a graph container that reports `data-zs-cg-status="ready"` after successful renderer setup

#### Scenario: Graph rendering fails

- **WHEN** the standalone graph renderer cannot initialize
- **THEN** the graph container SHALL report `data-zs-cg-status="failed"`
- **AND** the user SHALL see a compact fallback message instead of an empty frame
