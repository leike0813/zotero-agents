## ADDED Requirements

### Requirement: CLI guidance treats library cursors as opaque

The generated Host Bridge CLI guidance SHALL instruct agents to omit the cursor for a first library page and pass through only a returned cursor for subsequent pages.

#### Scenario: Agent starts and continues library pagination

- **WHEN** an agent follows generated guidance for library list, snapshot, or readiness commands
- **THEN** the first request SHALL omit `cursor`
- **AND** each later request SHALL use the exact `nextCursor` returned by the preceding page
- **AND** the guidance MUST NOT construct or increment numeric offsets.
