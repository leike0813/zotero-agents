## MODIFIED Requirements

### Requirement: Rust CLI exposes semantic command groups

The CLI SHALL expose canonical semantic command groups for common Zotero host
operations rather than implementation-oriented legacy top-level groups.

#### Scenario: Agent uses canonical Host Bridge command families
- **WHEN** a user or agent needs bridge metadata, library reads, synthesis data,
  workflow definition operations, runtime control, mutation operations, file
  downloads, debug diagnostics, or raw capability diagnostics
- **THEN** the CLI SHALL expose `bridge`, `library`, `synthesis`, `workflow`,
  `run`, `mutation`, `file`, `debug`, and `call`
- **AND** it SHALL NOT expose legacy top-level semantic groups such as `status`,
  `manifest`, `item`, `note`, `topics`, `schemas`, `concepts`,
  `citation-graph`, `library-index`, `resolvers`, `reference-index`,
  `paper-artifacts`, `insights`, `literature`, `task`, or `skill-run`.

#### Scenario: Agent reads current library metadata for indexing
- **WHEN** a user or agent runs
  `zotero-bridge library snapshot --input <json-or-file>`
- **THEN** the CLI SHALL call the read-only `library.sync_snapshot` Host Bridge
  capability
- **AND** the result SHALL contain bounded current Zotero metadata suitable for
  a local agent-side index.

#### Scenario: Agent reads compact current library pages
- **WHEN** a user or agent runs
  `zotero-bridge library items list --input <json-or-file>`
- **THEN** the CLI SHALL call the existing read-only `library.list_items`
  capability
- **AND** the command SHALL not trigger Zotero mutations or Synthesis cache
  refresh.

#### Scenario: Agent reads item and note objects
- **WHEN** a user or agent runs `library item search|get|notes|attachments` or
  `library note get|payloads|payload`
- **THEN** the CLI SHALL call the same library capabilities as the previous
  item and note commands
- **AND** the payload shape SHALL remain compatible with the previous semantic
  CLI behavior.

#### Scenario: Agent reads synthesis data
- **WHEN** a user or agent runs `synthesis topic`, `synthesis concept`,
  `synthesis graph`, `synthesis index`, `synthesis resolver`,
  `synthesis artifact`, `synthesis insight`, or `synthesis schema` commands
- **THEN** the CLI SHALL call the corresponding existing Synthesis Host Bridge
  capabilities
- **AND** the command SHALL NOT trigger Zotero mutations except for existing
  approval-gated diagnostic repair operations such as graph metric refresh.

### Requirement: Rust CLI exposes workflow and file commands

The system SHALL define CLI commands for workflow listing, workflow description,
workflow submission, workflow agent-owned handoff, runtime run control, and
registered file downloads.

#### Scenario: CLI inspects runtime control state
- **WHEN** a user or agent runs `zotero-bridge run get <workflowRunId>`,
  `zotero-bridge run list`, `zotero-bridge run active`, or
  `zotero-bridge run skill get <skillRunId>`
- **THEN** the CLI SHALL call the existing Host Bridge runtime control endpoint
  for that command
- **AND** workflow run ids and skill run ids SHALL remain explicit and not be
  inferred from each other.

#### Scenario: CLI requests workflow cancel intent
- **WHEN** a user or agent runs `zotero-bridge run cancel <workflowRunId>`
- **THEN** the CLI SHALL post a workflow run-level cancel intent to the existing
  cancel endpoint
- **AND** it SHALL NOT promise immediate terminal state.

#### Scenario: CLI interacts with explicit skill runs
- **WHEN** a user or agent runs
  `zotero-bridge run skill reply <skillRunId> --message <message>` or
  `zotero-bridge run skill connect <skillRunId>`
- **THEN** the CLI SHALL call the matching skill-run interaction endpoint
- **AND** it SHALL NOT accept a workflow run id as an implicit target.

## ADDED Requirements

### Requirement: Canonical CLI surface is generated and governed

The project SHALL treat the canonical CLI surface catalog as the SSOT for
generated Host Bridge wrapper and profile documentation.

#### Scenario: Generated surface includes only canonical examples
- **WHEN** Host Bridge surface documentation, wrapper skill references, topic
  synthesis fragments, or zotero-librarian profile references are rendered
- **THEN** generated command examples SHALL use canonical CLI commands
- **AND** generated primary documentation SHALL NOT include legacy top-level
  CLI command strings.

#### Scenario: Public capability coverage is checked
- **WHEN** the Host Bridge surface catalog is validated
- **THEN** every public non-raw Host Bridge capability SHALL have a canonical CLI
  mapping
- **AND** every semantic endpoint used by agents SHALL have a canonical CLI
  mapping.
