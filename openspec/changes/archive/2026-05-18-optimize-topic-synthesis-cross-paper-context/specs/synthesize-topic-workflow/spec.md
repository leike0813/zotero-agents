# synthesize-topic-workflow

## ADDED Requirements

### Requirement: Cross-paper context is split into filtered Markdown views

Create and update topic synthesis runtimes SHALL export Stage 5 LLM context as
separate Markdown views for primary synthesis and external literature analysis.

#### Scenario: Main context is filtered for primary synthesis

- **WHEN** `export_cross_paper_context` runs
- **THEN** it SHALL write `runtime/views/cross-paper-context.md`
- **AND** each paper entry SHALL include paper metadata, per-paper analysis, and
  digest content filtered to the first four top-level `##` sections
- **AND** it SHALL NOT include references payloads, citation-analysis payloads,
  raw note HTML, decoded full payload text, or hash-bearing artifact fields.

#### Scenario: External literature context is grouped by paper

- **WHEN** `export_cross_paper_context` runs
- **THEN** it SHALL write `runtime/views/external-literature-context.md`
- **AND** each paper entry SHALL group compact references and that same paper's
  citation analysis report together
- **AND** references SHALL only expose `id`, `year`, compact authors, and
  `title`
- **AND** citation analysis SHALL expose only the full
  `citation_analysis.report_md`.

#### Scenario: Manifest carries machine provenance

- **WHEN** `export_cross_paper_context` runs
- **THEN** it SHALL write `runtime/views/cross-paper-context.manifest.json`
- **AND** the manifest SHALL include context paths, hashes, byte sizes, paper
  count, artifact status counts, and filtering diagnostics
- **AND** the manifest SHALL NOT include full artifact payload bodies,
  `decoded_text`, raw HTML, references `raw`, or `payload_hash`.

### Requirement: Cross-paper synthesis binds context provenance from runtime

`persist_cross_paper_synthesis` SHALL use the latest registered context
provenance from SQLite metadata and SHALL NOT require the agent to copy context
hashes into the payload.

#### Scenario: Agent omits context hash

- **GIVEN** `export_cross_paper_context` has registered context artifacts
- **WHEN** `persist_cross_paper_synthesis` receives section payloads without
  `source_context_hash`
- **THEN** runtime SHALL accept the payload if sections are otherwise valid
- **AND** SHALL bind provenance from the registered context metadata.

#### Scenario: Agent supplies stale context hash

- **GIVEN** `export_cross_paper_context` has registered context artifacts
- **WHEN** `persist_cross_paper_synthesis` receives a supplied context hash that
  differs from runtime metadata
- **THEN** runtime SHALL reject the payload with a context hash mismatch.
