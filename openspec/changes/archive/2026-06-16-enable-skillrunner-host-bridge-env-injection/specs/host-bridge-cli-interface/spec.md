## ADDED Requirements

### Requirement: Host Bridge CLI endpoint can be supplied by runtime env

The Host Bridge CLI SHALL resolve endpoints using command-line, environment,
and profile sources in deterministic priority order.

#### Scenario: Environment endpoint overrides profile endpoint

- **GIVEN** a profile contains `endpoint`
- **AND** `ZOTERO_BRIDGE_ENDPOINT` is set
- **WHEN** the CLI loads configuration without `--endpoint`
- **THEN** it SHALL use `ZOTERO_BRIDGE_ENDPOINT`
- **AND** it SHALL still read token configuration from the profile.

#### Scenario: Command endpoint overrides environment endpoint

- **GIVEN** `--endpoint` is provided
- **AND** `ZOTERO_BRIDGE_ENDPOINT` is set
- **WHEN** the CLI loads configuration
- **THEN** it SHALL use the command-line endpoint.

### Requirement: Host Bridge CLI profile declares connection mode

Host Bridge CLI profiles SHALL allow callers to declare whether they are
intended for local or remote callers.

#### Scenario: Local profile

- **WHEN** the plugin writes an ACP run or well-known local profile
- **THEN** the profile SHALL include `connectionMode: "local"`.

#### Scenario: Remote profile

- **WHEN** the plugin creates a copied remote LAN profile
- **THEN** the profile SHALL include `connectionMode: "remote"`.

#### Scenario: CLI accepts profile connection mode

- **WHEN** a profile contains `connectionMode: "local"` or
  `connectionMode: "remote"`
- **THEN** the CLI SHALL parse the profile successfully
- **AND** v1 SHALL NOT use the field for authorization decisions.
