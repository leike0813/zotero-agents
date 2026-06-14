## ADDED Requirements

### Requirement: Topic context MCP tool exposes purpose-specific views

`topics.get_context` SHALL accept an optional `view` argument with values
`digest`, `semantic`, `audit`, and `full`.

#### Scenario: Digest view is requested
- **WHEN** an MCP or Host Bridge caller requests `topics.get_context` with
  `view: "digest"`
- **THEN** the response SHALL return a v2 topic context envelope containing
  basic topic identity and semantic summary data
- **AND** it SHALL NOT include audit-only hashes, paths, diagnostics, or update
  hints.

#### Scenario: Semantic view is requested
- **WHEN** an MCP or Host Bridge caller requests `topics.get_context` with
  `view: "semantic"`
- **THEN** the response SHALL return complete semantic topic content
- **AND** it SHALL NOT include `current_hashes`, `section_hashes`, paths,
  diagnostics, or `recommended_update`.

#### Scenario: Audit view is requested
- **WHEN** an MCP or Host Bridge caller requests `topics.get_context` with
  `view: "audit"`
- **THEN** the response SHALL return hashes, manifest/metadata, freshness,
  source materials, discovery, diagnostics, and update hints
- **AND** it SHALL NOT inline long semantic artifact body content.

#### Scenario: Full view is requested
- **WHEN** an MCP or Host Bridge caller requests `topics.get_context` with
  `view: "full"`
- **THEN** the response SHALL contain nested `digest`, `semantic`, and `audit`
  objects.

### Requirement: Topic context MCP tool can materialize large view results

`topics.get_context` SHALL accept `outputPath` and `output_path` for explicit
view requests and return a compact file-output envelope instead of inlining the
full result.

#### Scenario: Explicit view is written to a file
- **WHEN** a caller requests `topics.get_context` with a valid explicit `view`
  and `outputPath`
- **THEN** the full view JSON SHALL be written as UTF-8 pretty JSON
- **AND** the response SHALL include `omitted_inline_result: true` and file
  metadata including mode, path, bytes, and sha256.

#### Scenario: Legacy topic context remains compatible
- **WHEN** a caller requests `topics.get_context` without `view`
- **THEN** the response SHALL keep the legacy flat shape and legacy include flag
  behavior.
