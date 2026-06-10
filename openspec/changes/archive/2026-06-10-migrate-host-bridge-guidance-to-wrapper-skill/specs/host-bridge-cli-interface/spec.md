## MODIFIED Requirements

### Requirement: ACP agent runs receive a Host Bridge CLI injection bundle

The system SHALL make `zotero-bridge` available to ACP agent runs without
requiring user-level CLI installation.

#### Scenario: ACP run is materialized

- **WHEN** the plugin prepares an ACP agent run workspace
- **THEN** it SHALL write `.zotero-bridge/profile.json`, a short
  `.zotero-bridge/README.md`, and CLI shims when the CLI binary is available
- **AND** it SHALL inject `PATH`, `ZOTERO_BRIDGE_PROFILE`, and
  `ZOTERO_BRIDGE_TOKEN` into the agent runtime environment
- **AND** the profile SHALL reference the token through an environment-variable
  reference rather than storing the token in clear text by default
- **AND** detailed Host Bridge command guidance SHALL come from the built-in
  `zotero-bridge-cli` wrapper skill, not from ACP prompt injection.

#### Scenario: ACP run prompt is generated

- **WHEN** the plugin generates the ACP run prompt or engine instruction file
- **THEN** it SHALL NOT append Host Bridge CLI command guidance directly
- **AND** the run-local skill roots or shared catalog SHALL expose the
  `zotero-bridge-cli` wrapper skill when Zotero host access is enabled.

### Requirement: Host Bridge CLI documentation SHALL stay aligned with broker capabilities

The repository SHALL provide a local check that guards Host Bridge CLI docs,
wrapper skill guidance, MCP tool wiring, and CLI semantic mapping against
obvious capability drift.

#### Scenario: Doc-sync check

- **WHEN** the host bridge doc-sync check runs
- **THEN** it SHALL read Host Bridge capability names from the capability
  registry source
- **AND** it SHALL fail when core capability names are missing from the CLI docs,
  wrapper skill reference, CLI source, or MCP mirror wiring
- **AND** it SHALL fail when removed Host Bridge ACP prompt templates or the old
  wrapper skill asset path still exist.

#### Scenario: Generated surface sections are checked

- **WHEN** the Host Bridge surface render check runs in `--check` mode
- **THEN** it SHALL derive a catalog from the capability registry and Rust CLI
  mappings
- **AND** it SHALL fail when generated sections in CLI docs, the built-in
  wrapper skill, the wrapper skill reference, or topic-synthesis fragments are
  stale.
