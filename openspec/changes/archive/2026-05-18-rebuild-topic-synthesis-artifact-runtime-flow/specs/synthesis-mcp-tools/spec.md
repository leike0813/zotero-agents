# synthesis-mcp-tools

## MODIFIED Requirements

### Requirement: Synthesis MCP tools are read-only

Synthesis MCP tools SHALL expose read-only host capabilities for synthesis and
review workflow jobs.

#### Scenario: Job-time synthesis tool surface is bounded

- **WHEN** an MCP client lists Synthesis tools
- **THEN** `synthesis.list_topics`, `synthesis.get_topic_context`,
  `synthesis.get_library_index`, `synthesis.resolve_resolver`,
  `synthesis.get_paper_registry`, `synthesis.get_citation_graph_slice`,
  `synthesis.get_review_input`, and
  `synthesis.export_filtered_paper_artifacts` SHALL be present
- **AND** `synthesis.get_paper_artifact_manifest`,
  `synthesis.read_paper_artifacts`, and
  `synthesis.export_paper_artifact_bundle` SHALL NOT be present.

## ADDED Requirements

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
