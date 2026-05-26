# synthesis-mcp-tools Specification

## Purpose
TBD - created by archiving change add-synthesis-mcp-tools. Update Purpose after archive.
## Requirements
### Requirement: Synthesis job-time tools are exposed through embedded MCP

The embedded Zotero MCP protocol SHALL expose read-only Synthesis job-time tools
for ACP Skills agents.

#### Scenario: Tools are listed

- **WHEN** an MCP client calls `tools/list`
- **THEN** Synthesis job-time tools SHALL appear with names beginning
  `synthesis.`
- **AND** they SHALL use JSON object input schemas.

### Requirement: Synthesis MCP uses a DTO service boundary

Synthesis MCP tools SHALL call an injectable service boundary and SHALL NOT
expose raw Zotero objects.

#### Scenario: Tool is called

- **WHEN** a Synthesis MCP tool is called
- **THEN** the protocol handler SHALL route the validated args to the matching
  Synthesis service method
- **AND** return structured DTO content.

### Requirement: Synthesis MCP tools are read-only

Synthesis MCP tools SHALL expose read-only host capabilities for synthesis and review workflow jobs.

#### Scenario: Canonical-backed graph tools are listed

- **WHEN** an MCP client lists Synthesis tools
- **THEN** existing paper registry, citation graph slice, and citation graph metrics tools SHALL remain read-only
- **AND** no cleanup write tool SHALL be exposed through MCP in this phase.

### Requirement: Synthesis MCP inputs are strict

Synthesis MCP inputs SHALL reject unknown top-level fields.

#### Scenario: Unknown arg is supplied

- **WHEN** a Synthesis tool call contains an unknown top-level argument
- **THEN** the MCP handler SHALL reject the call with an invalid parameter error.

### Requirement: Topic inventory is semantic and bounded

The embedded Zotero MCP protocol SHALL expose `synthesis.list_topics` for
create-mode Synthesis topic duplicate checks.

#### Scenario: Topic inventory is listed

- **WHEN** an MCP client calls `tools/list`
- **THEN** `synthesis.list_topics` SHALL be present
- **AND** it SHALL use an empty JSON object input schema.

#### Scenario: Topic inventory is called

- **WHEN** an MCP client calls `synthesis.list_topics`
- **THEN** the MCP layer SHALL route to the Synthesis service
- **AND** it SHALL return topic rows with `topic_id`, `title`, `description`,
  `aliases`, and `updated_at`.

#### Scenario: Topic inventory remains small

- **WHEN** `synthesis.list_topics` returns existing topics
- **THEN** it SHALL NOT return resolver details, resolved paper sets, paper
  references, registry rows, artifact hashes, graph hashes, or Markdown
  excerpts.

### Requirement: Detailed topic context is update-only

Detailed Synthesis topic context SHALL remain separate from create-mode
duplicate checks.

#### Scenario: Existing topic is selected for update

- **WHEN** an ACP Skill agent needs resolver, base hash, old artifact, or
  resolved paper set details for an existing topic
- **THEN** it SHALL call `synthesis.get_topic_context` with the selected
  `topicId`.

### Requirement: Synthesis topic tools separate duplicate inventory from update context

Synthesis MCP topic inventory SHALL remain small, while detailed topic context
SHALL expose deterministic freshness for update workflows.

#### Scenario: Topic context contains freshness

- **WHEN** `synthesis.get_topic_context` is called for an active topic
- **THEN** the returned context SHALL include the current freshness state and
  reasons.

#### Scenario: Topic inventory excludes freshness

- **WHEN** `synthesis.list_topics` is called
- **THEN** the returned topic entries SHALL NOT include freshness, resolver,
  resolved paper set, artifact hashes, or markdown excerpts.

### Requirement: Citation graph metrics are available through bounded MCP

The embedded Zotero MCP protocol SHALL expose read-only `synthesis.get_citation_graph_metrics` values from canonical-backed citation graph projections.

#### Scenario: Metrics projection is stale

- **WHEN** a caller requests citation graph metrics and the projection is missing or stale
- **THEN** the MCP response SHALL report structured missing or stale diagnostics
- **AND** it SHALL NOT return raw Zotero objects or an unbounded full graph.

### Requirement: Review input returns structured topic synthesis content

`synthesis.get_review_input` SHALL return the review-oriented topic synthesis
sections when present.

#### Scenario: Structured review input is requested

- **WHEN** a caller requests review input for a topic with a current structured
  artifact
- **THEN** the response SHALL include the current artifact sections, including
  positioning, taxonomy, comparison matrix, debates, review outline, and
  evidence map.

### Requirement: Filtered paper artifacts are exported as manifest plus content files

The Synthesis MCP export tool SHALL write a compact manifest and filtered
artifact content files into the current ACP skill run workspace.

#### Scenario: Filtered artifact export writes only bounded files

- **WHEN** an agent calls `synthesis.export_filtered_paper_artifacts` with
  `run_root` and `paper_refs`
- **THEN** the host SHALL write
  `runtime/payloads/paper-artifacts-manifest.json`
- **AND** for each available artifact it SHALL write one filtered content file
  under `runtime/payloads/artifacts/<safe-paper-ref>/`
- **AND** the manifest SHALL include status, provenance, `payload_hash`,
  `content_file`, `content_hash`, and diagnostics
- **AND** neither the manifest nor the MCP response SHALL contain
  `decoded_text`, raw payload bodies, raw note HTML, or references parser
  internals.

#### Scenario: Citation analysis trailing section is removed by position

- **WHEN** citation analysis report Markdown contains at least two same-level
  report sections after wrapper removal
- **THEN** the exported citation-analysis Markdown SHALL omit the final report
  section by position
- **AND** the removal decision SHALL NOT depend on matching a translated
  heading string.

### Requirement: Synthesis registry reads are paged

`synthesis.get_paper_registry` SHALL support bounded paper registry reads from canonical-backed projection state.

#### Scenario: Registry page is requested

- **WHEN** a client calls `synthesis.get_paper_registry` with `cursor` and `limit`
- **THEN** the result SHALL include a bounded row page, `cursor`, `next_cursor`, `has_more`, `returned`, and `total`
- **AND** rows SHALL come from the canonical-backed registry projection when available.

### Requirement: Resolver results are paged

`synthesis.resolve_resolver` SHALL return bounded resolved paper pages.

#### Scenario: Resolver matches many papers

- **WHEN** a resolver matches more papers than the requested `limit`
- **THEN** the response SHALL include only the requested page
- **AND** it SHALL include `next_cursor`, `has_more`, `returned`, and `total`.

### Requirement: Library index pages are compact by default

`synthesis.get_library_index` SHALL avoid returning unnecessary large sections
unless explicitly requested.

#### Scenario: Compact index page is requested

- **WHEN** include flags are omitted
- **THEN** the result SHALL include a bounded papers page
- **AND** it SHALL omit full tags, collections, registry, and topics unless their
  include flags request them.

### Requirement: Topic context is summary-first

`synthesis.get_topic_context` SHALL return compact update context by default.

#### Scenario: Default topic context is requested

- **WHEN** a client calls `synthesis.get_topic_context` without full include
  flags
- **THEN** the response SHALL include identifiers, definitions, resolver,
  paper-set metadata, hashes, freshness, and recommended update information
- **AND** it SHALL omit full markdown and full structured artifact bodies.

### Requirement: Review input is bounded

`synthesis.get_review_input` SHALL honor graph, artifact, and text limits.

#### Scenario: Review input exceeds limits

- **WHEN** review input content exceeds requested or default limits
- **THEN** the response SHALL truncate bounded sections
- **AND** diagnostics SHALL state what was truncated and how to request more
  specific context.

### Requirement: Synthesis MCP reads do not trigger maintenance work

Synthesis MCP read-only tools SHALL NOT enqueue rebuild jobs, write projection
state, write durable job state, or schedule retries.

#### Scenario: Paper registry projection is stale

- **WHEN** an MCP client calls `synthesis.get_paper_registry` and the registry
  projection is stale
- **THEN** the response SHALL include bounded rows or diagnostics
- **AND** no registry rebuild job SHALL be enqueued by that call.

#### Scenario: Citation graph projection is missing

- **WHEN** an MCP client calls `synthesis.get_citation_graph_slice` or
  `synthesis.get_citation_graph_metrics` and projection state is missing
- **THEN** the response SHALL be bounded and diagnostic
- **AND** no graph rebuild or layout job SHALL start from that read.

### Requirement: Synthesis MCP exposes freshness without raw state

Synthesis MCP read results SHALL expose freshness and latest usable state
without returning raw Zotero objects or unbounded graph data.

#### Scenario: Stale data is returned

- **WHEN** an MCP read returns stale-but-usable Synthesis data
- **THEN** the DTO SHALL indicate stale or partial status
- **AND** it SHALL include an explicit recommended host command when available.

### Requirement: Synthesis MCP read-only tools handle stale literature projections

Synthesis MCP read-only registry tools SHALL avoid synchronous full rebuilds while serving bounded responses.

#### Scenario: Paper registry projection is missing

- **WHEN** a read-only paper registry request is served without a registry projection
- **THEN** the service SHALL return bounded best-effort rows with diagnostics
- **AND** it SHALL enqueue a background literature rebuild best-effort
- **AND** it SHALL NOT synchronously rebuild canonical registry state.

#### Scenario: Paper registry projection is stale

- **WHEN** a read-only paper registry request observes a stale projection
- **THEN** the service SHALL include bounded diagnostics
- **AND** it SHALL NOT return raw Zotero objects.

