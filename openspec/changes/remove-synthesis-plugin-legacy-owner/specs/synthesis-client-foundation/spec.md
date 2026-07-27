## MODIFIED Requirements

### Requirement: Production client composition SHALL be native-only

After a completed cutover receipt, the default production composition SHALL use
only the authenticated native client and bounded reverse-Host ports. The plugin
source and build graph MUST NOT contain a legacy production composition,
in-process owner factory, service/repository owner, or test/harness path capable
of constructing that owner. Tests MAY build the public client over a bounded
fake port but MUST NOT recreate production persistence or application
composition.

#### Scenario: Production dependency graph is checked
- **WHEN** static client-boundary validation runs after plugin legacy retirement
- **THEN** no default-client, Workbench, workflow, Host Bridge, MCP, startup, maintenance, test, or harness path imports or creates a plugin legacy owner
- **AND** no implementation selector can restore that route

#### Scenario: Native service is unavailable
- **WHEN** a caller acquires or invokes the production client without a verified native owner
- **THEN** the call fails through the stable maintenance, unavailable, incompatible, or repair-required category
- **AND** no plugin service, repository, engine composition, or production root is opened

## ADDED Requirements

### Requirement: Grouped client adaptation SHALL be owner-neutral

The mapping from the closed production operation port to the grouped
`SynthesisClient` facade SHALL be owned by one neutral adapter. The adapter MUST
contain no persistence, canonical, Host, engine, service, lifecycle, transport,
or implementation-selection logic, and both native production composition and
bounded test ports SHALL reuse the same mapping.

#### Scenario: Native composition builds the grouped client
- **WHEN** the verified native composition receives a ready production port
- **THEN** it constructs the unchanged grouped public client through the neutral adapter
- **AND** the exact 95-operation port/96-method public inventory remains unchanged

#### Scenario: Neutral adapter dependencies are inspected
- **WHEN** its import and export graph is checked
- **THEN** it depends only on public contracts, DTO rebuilders, stable error mapping, and the supplied port
- **AND** it exports no in-process owner or service factory

