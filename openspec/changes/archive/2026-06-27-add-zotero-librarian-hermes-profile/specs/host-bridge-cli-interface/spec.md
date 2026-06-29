## MODIFIED Requirements

### Requirement: Rust CLI exposes semantic command groups

The CLI SHALL provide semantic commands for common Zotero host operations rather
than forcing agents to use generic capability calls.

#### Scenario: Agent reads current library metadata for indexing

- **WHEN** a user or agent runs
  `zotero-bridge library snapshot --input <json-or-file>`
- **THEN** the CLI SHALL call the read-only `library.sync_snapshot` Host Bridge
  capability
- **AND** the result SHALL contain bounded current Zotero metadata suitable for
  a local agent-side index.

#### Scenario: Agent reads compact current library pages

- **WHEN** a user or agent runs
  `zotero-bridge library list --input <json-or-file>`
- **THEN** the CLI SHALL call the existing read-only `library.list_items`
  capability
- **AND** the command SHALL not trigger Zotero mutations or Synthesis cache
  refresh.

### Requirement: Host Bridge CLI documentation SHALL stay aligned with broker capabilities

The repository SHALL provide a local check that guards Host Bridge CLI docs,
wrapper skill guidance, profile distribution guidance, MCP tool wiring, and CLI
semantic mapping against obvious capability drift.

#### Scenario: Profile Host Bridge guidance is generated

- **WHEN** the Host Bridge surface render check runs in `--check` mode
- **THEN** it SHALL derive profile Host Bridge guidance from the same catalog as
  the CLI docs and wrapper skill
- **AND** it SHALL fail when the `zotero-librarian` profile reference is stale.
