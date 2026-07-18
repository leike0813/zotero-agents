## ADDED Requirements

### Requirement: Active documentation distinguishes the WS5 milestone from Stage 1 completion

Active Synthesis planning and current-state documentation SHALL use the exact
name `Stage 1 / WS5 — Private Isolated Synthesis Foundation Complete` whenever
it reports the Stage 1/WS5 milestone, and SHALL distinguish that milestone from
WS6 shadow verification, WS7 production cutover, complete Stage 1 delivery,
and real-machine acceptance.

#### Scenario: Maintainer reviews current Stage 1 status

- **WHEN** a maintainer reads an active Synthesis status or migration plan
- **THEN** the completed scope SHALL be limited to the private isolated
  application, repository, canonical, and maintenance foundations
- **AND** the documentation SHALL NOT describe Stage 1, production cutover, or
  real-machine acceptance as complete

#### Scenario: Maintainer locates remaining remote and production work

- **WHEN** a maintainer reviews the WS6 and WS7 workstreams
- **THEN** WS6 SHALL own representative remote client/routes, bounded process
  events, Host-port canaries, and shadow parity without production writes
- **AND** WS7 SHALL own complete production consumer routing and the atomic
  single-writer cutover

#### Scenario: Maintainer reviews Host boundary ownership

- **WHEN** active planning describes WebDAV credentials or remote export
  delivery
- **THEN** credentials and prefs SHALL remain owned by the plugin WebDAV Host
  adapter behind a secret-free application port
- **AND** export applications SHALL provide bounded canonical entries through
  `SynthesisHostExportDeliveryPort` while the plugin Host adapter owns
  ephemeral materialization, registration, delivery, and cleanup
- **AND** the plan SHALL NOT require a service-owned secret store or export
  asset registry
