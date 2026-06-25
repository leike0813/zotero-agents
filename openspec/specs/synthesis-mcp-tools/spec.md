## Purpose

Synthesis MCP tools expose cache views and must not start refresh from read calls.

## Requirements

### Requirement: Synthesis MCP registry and graph tools are cache views

Synthesis MCP tools that expose registry, reference, or citation graph data SHALL identify the data as sidecar cache, not Zotero Library truth.

#### Scenario: Paper registry tool is called
- **WHEN** an MCP client reads paper registry data
- **THEN** the response SHALL include cache status or diagnostics
- **AND** it SHALL NOT imply that Zotero Library has been synchronized.

### Requirement: Synthesis MCP reads never start refresh

Synthesis MCP read tools SHALL remain side-effect free.

#### Scenario: Cache is missing
- **WHEN** an MCP client requests missing cache data
- **THEN** the tool SHALL return bounded empty data or diagnostics
- **AND** it SHALL NOT start refresh, enqueue work, or write operation rows.

### Requirement: MCP cache diagnostics do not start work

Synthesis MCP tools SHALL report Reference Sidecar and Citation Graph cache readiness without starting refresh or graph rebuild.

#### Scenario: Graph cache is stale
- **WHEN** an MCP graph read detects stale graph cache basis
- **THEN** it SHALL return diagnostics recommending `rebuildCitationGraphCacheNow`
- **AND** it SHALL NOT run Reference Sidecar refresh, graph cache rebuild, or layout rebuild.

#### Scenario: Reference sidecar is stale
- **WHEN** an MCP registry/cache read detects stale sidecar cache basis
- **THEN** it SHALL recommend `refreshReferenceSidecarNow`
- **AND** it SHALL NOT read legacy projection state to infer readiness.

### Requirement: MCP diagnostics expose advanced matching state without starting work

Synthesis MCP diagnostics SHALL report advanced reference matching operations and proposal counts without running the matcher.

#### Scenario: Proposal diagnostics are requested
- **WHEN** a read-only MCP or Host Bridge debug command lists reference matching status
- **THEN** it SHALL return bounded proposal counts and recent operation diagnostics
- **AND** it SHALL NOT start advanced matching, refresh sidecar data, or rebuild graph cache.

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
full result. When invoked through a remote Host Bridge connection mode, the tool
SHALL use a Host Bridge download bundle instead of writing to the
caller-provided path.

#### Scenario: Explicit view is written to a file
- **WHEN** a caller requests `topics.get_context` with a valid explicit `view`
  and `outputPath`
- **AND** the Host Bridge connection mode is `local`
- **THEN** the full view JSON SHALL be written as UTF-8 pretty JSON to
  `outputPath`
- **AND** the response SHALL include `output.mode: "file"`
- **AND** the response SHALL include `omitted_inline_result: true` and file
  metadata including mode, path, bytes, and sha256.

#### Scenario: Remote topic context returns a bundle
- **WHEN** a caller requests `topics.get_context` with a valid explicit `view`
  and `outputPath`
- **AND** the Host Bridge connection mode is `remote`
- **THEN** the service SHALL NOT write to the caller-provided path
- **AND** the service SHALL create a zip bundle whose entry path is the
  normalized requested output path
- **AND** the response SHALL include `output.mode: "bridge-download"`
- **AND** the response SHALL include `delivery.mode: "bridge-download"`
- **AND** the response SHALL NOT expose any host-local absolute path.

#### Scenario: Legacy topic context remains compatible
- **WHEN** a caller requests `topics.get_context` without `view`
- **THEN** the response SHALL keep the legacy flat shape and legacy include flag
  behavior.

### Requirement: Remote filtered paper artifact export uses bridge-download bundle

`paper_artifacts.export_filtered` SHALL keep local run-root writes and SHALL use
a Host Bridge download bundle when invoked through a remote Host Bridge
connection mode.

#### Scenario: Local filtered paper artifact export writes run root
- **WHEN** `paper_artifacts.export_filtered` is called with `run_root`
- **AND** the Host Bridge connection mode is `local`
- **THEN** the service SHALL write
  `runtime/payloads/paper-artifacts-manifest.json` and content files under the
  supplied run root
- **AND** the response SHALL include `manifest_file` as that relative path.

#### Scenario: Remote filtered paper artifact export returns a bundle
- **WHEN** `paper_artifacts.export_filtered` is called for one or more paper refs
- **AND** the Host Bridge connection mode is `remote`
- **THEN** the service SHALL generate the filtered manifest and content files in
  a host temporary export directory
- **AND** the service SHALL create a zip bundle preserving the
  `runtime/payloads/...` relative paths
- **AND** the response SHALL include `manifest_file` as the path inside the zip
- **AND** the response SHALL include `delivery.mode: "bridge-download"`
- **AND** the response SHALL NOT expose the host temporary export directory.
