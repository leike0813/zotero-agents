## Purpose

Define CLI routing for debug-only Host Bridge capabilities.

## Requirements

### Requirement: CLI exposes a debug namespace

The `zotero-bridge` CLI SHALL expose a top-level `debug` command namespace for
debug-only Host Bridge capabilities.

#### Scenario: User discovers debug commands

- **WHEN** a user runs `zotero-bridge --help`
- **THEN** the help SHALL list `debug` as a command group.

#### Scenario: User discovers debug subcommands

- **WHEN** a user runs `zotero-bridge debug --help`
- **THEN** the help SHALL list global debug commands and the Synthesis debug
  namespace.

### Requirement: CLI debug commands preflight the manifest

The CLI SHALL inspect the Host Bridge manifest before calling semantic debug
commands.

#### Scenario: Debug mode is disabled

- **WHEN** a user invokes a semantic `zotero-bridge debug ...` command
- **AND** the Host Bridge manifest does not expose the required `debug.*`
  capability
- **THEN** the CLI SHALL return a single JSON error object with
  `error.code: "debug_mode_disabled"`
- **AND** it SHALL NOT call the missing debug capability.

#### Scenario: Debug mode is enabled

- **WHEN** a user invokes a semantic `zotero-bridge debug ...` command
- **AND** the Host Bridge manifest exposes the mapped `debug.*` capability
- **THEN** the CLI SHALL call that capability with the parsed input payload.

### Requirement: CLI provides global debug commands

The CLI SHALL provide semantic commands for global Host Bridge debug snapshots.

#### Scenario: Debug status is requested

- **WHEN** `zotero-bridge debug status` is invoked
- **THEN** the CLI SHALL call `debug.status`.

#### Scenario: Debug persistence snapshot is requested

- **WHEN** `zotero-bridge debug persistence --input <JSON_OR_FILE>` is invoked
- **THEN** the CLI SHALL call `debug.persistence.snapshot`.

#### Scenario: Debug tasks snapshot is requested

- **WHEN** `zotero-bridge debug tasks --input <JSON_OR_FILE>` is invoked
- **THEN** the CLI SHALL call `debug.tasks.snapshot`.

### Requirement: CLI provides Synthesis debug diagnostics

The CLI SHALL provide semantic commands for Synthesis snapshot, diff, paper
inspect, and topic inspect diagnostics.

#### Scenario: Synthesis snapshot is requested

- **WHEN** `zotero-bridge debug synthesis snapshot --input <JSON_OR_FILE>` is
  invoked
- **THEN** the CLI SHALL call `debug.synthesis.snapshot`.

#### Scenario: Synthesis diff is requested

- **WHEN** `zotero-bridge debug synthesis diff --input <JSON_OR_FILE>` is
  invoked
- **THEN** the CLI SHALL call `debug.synthesis.diff`.

#### Scenario: Synthesis paper inspect is requested

- **WHEN** `zotero-bridge debug synthesis inspect-paper --input <JSON_OR_FILE>`
  is invoked
- **THEN** the CLI SHALL call `debug.synthesis.paper.inspect`.

#### Scenario: Synthesis topic inspect is requested

- **WHEN** `zotero-bridge debug synthesis inspect-topic --input <JSON_OR_FILE>`
  is invoked
- **THEN** the CLI SHALL call `debug.synthesis.topic.inspect`.

### Requirement: CLI provides Synthesis cache and operation diagnostics

The CLI SHALL provide semantic commands for Synthesis cache, operation, and
profiler diagnostics. Queue, dirty-event, worker, and maintenance controls SHALL
not be exposed as semantic CLI commands.

#### Scenario: Synthesis operation diagnostics are requested

- **WHEN** `zotero-bridge debug synthesis operations --input <JSON_OR_FILE>`
  is invoked
- **THEN** the CLI SHALL call `debug.synthesis.operations.list`.

#### Scenario: Synthesis profiler diagnostics are requested

- **WHEN** `zotero-bridge debug synthesis profiler --input <JSON_OR_FILE>` is
  invoked
- **THEN** the CLI SHALL call `debug.synthesis.profiler.list`.

#### Scenario: Synthesis cache diagnostics are requested

- **WHEN** `zotero-bridge debug synthesis cache --input <JSON_OR_FILE>` is
  invoked
- **THEN** the CLI SHALL call `debug.synthesis.cache.list`.

### Requirement: CLI debug input and output reuse existing JSON contracts

Debug commands SHALL reuse the CLI's existing JSON input parsing and single
JSON stdout envelope.

#### Scenario: Debug command receives input

- **WHEN** a debug command accepts `--input`
- **THEN** inline JSON, `@file`, existing file path, and stdin `-` SHALL be
  parsed using the same rules as existing semantic commands.

#### Scenario: Debug command succeeds

- **WHEN** a debug command succeeds
- **THEN** stdout SHALL contain exactly one final JSON object with `ok: true`,
  `data`, and `meta`.

#### Scenario: Debug command fails

- **WHEN** a debug command fails
- **THEN** stdout SHALL contain exactly one final JSON object with `ok: false`,
  `error`, and `meta`
- **AND** bearer tokens SHALL NOT appear in stdout or stderr.

### Requirement: CLI does not validate dangerous debug phrases as authority

The CLI SHALL NOT treat dangerous debug confirmation phrases as authority. It
MAY pass dangerous debug inputs through, but the Host Bridge capability SHALL
remain the authority for approval and confirmation validation.

#### Scenario: Dangerous clean install reset is invoked

- **WHEN** `zotero-bridge debug synthesis clean-install-reset --input <JSON_OR_FILE>` is
  invoked
- **THEN** the CLI SHALL call `debug.synthesis.cleanInstallReset` only if the
  manifest exposes it
- **AND** the CLI SHALL NOT treat a local phrase match as sufficient approval.
