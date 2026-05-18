# zotero-mcp-tool-suite

## ADDED Requirements

### Requirement: Synthesis tool suite supports review-ready topic artifacts

The Zotero MCP tool suite SHALL expose topic synthesis artifacts that contain
review-ready evidence structures without adding new write tools.

#### Scenario: Topic detail is read after synthesis

- **WHEN** a topic synthesis artifact contains review-oriented sections
- **THEN** read-only synthesis tools SHALL return those sections as structured
  JSON-safe values
- **AND** no tool SHALL expose raw full paper artifact payloads for this
  purpose.
