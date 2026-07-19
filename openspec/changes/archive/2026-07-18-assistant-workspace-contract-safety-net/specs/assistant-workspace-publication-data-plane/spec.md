## ADDED Requirements

### Requirement: Wire field registries are exposed by both peers

The v1 publication wire field lists SHALL be defined once per peer as
importable constants: exported from the host publication module and exposed
by the ACP child as
`window.AssistantWorkspaceAcpChild.wireFieldRegistry`. The lists SHALL cover
envelope keys, per-kind region payload keys, transcript snapshot and delta
keys, permission request keys, and forbidden wire fields. Both peers SHALL
reject host-internal fields using the same 15-entry forbidden set.

#### Scenario: Drift guard compares both registries

- **WHEN** the wire drift guard test runs
- **THEN** it SHALL fail naming the kind and the differing fields whenever the
  host and child registries disagree on any envelope, payload, transcript,
  permission, or forbidden key set.

#### Scenario: Host-internal field reaches the receiver

- **WHEN** a publication payload contains a forbidden wire field such as
  `deliveryRevision`, `initialization`, `totalItemCount`, `eventSeq`,
  `uiRevision`, or `baseUiRevision`
- **THEN** the child receiver SHALL reject the publication as invalid.

### Requirement: Debug builds self-check produced publications

Debug builds SHALL assert every outgoing publication against the strict v1
wire schema at the coordinator's single construction point before it is
posted. The check SHALL be gated by a build-time capability flag and debug
mode so release builds fold it out entirely.

#### Scenario: Malformed publication in a debug build

- **WHEN** a debug build constructs a publication whose payload violates the
  v1 key registry
- **THEN** construction SHALL throw before the publication is posted.

#### Scenario: Release build constructs publications

- **WHEN** a release build constructs any publication
- **THEN** no wire assertion SHALL execute.

### Requirement: Data-plane tests derive fixtures from production constructors

Publication data-plane tests SHALL source payloads from the production region
and transcript constructors rather than hand-written literals. Boundaries
whose production constructor is impractical to seed in Node (service-status,
acp-skills owner-details) MAY keep hand-written fixtures only when a smoke
assertion verifies the production constructor's output passes the v1 wire
assertion.

#### Scenario: Producer adds a payload field

- **WHEN** a production region constructor emits a new payload field
- **THEN** the data-plane fixtures SHALL carry that field without manual
  fixture edits
- **AND** the wire drift guard SHALL fail until the receiver registry is
  updated.
