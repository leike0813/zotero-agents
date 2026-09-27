## ADDED Requirements

### Requirement: Host request body admission SHALL follow trusted header preflight

The listener SHALL parse only a bounded request head before route, method, and authentication preflight. It SHALL continue reading a body only after preflight accepts the request and supplies that route's body limit. Health and rejected requests SHALL accept no body, ordinary Bridge and MCP requests SHALL accept at most 1 MiB, and managed upload requests SHALL accept at most 16 MiB.

#### Scenario: Unauthorized caller declares a large body

- **WHEN** a non-health request declares a body but bearer authentication fails
- **THEN** the listener SHALL return unauthorized without consuming the declared body
- **AND** no business handler SHALL execute.

#### Scenario: Authenticated route exceeds its own body limit

- **WHEN** an authenticated request declares a body larger than the selected route permits
- **THEN** the listener SHALL reject it before consuming the body.

### Requirement: Accepted Host connections SHALL be bounded

The Host Access listener SHALL admit at most 16 accepted connections concurrently and SHALL configure a matching bounded socket backlog.

#### Scenario: Connection capacity is exhausted

- **WHEN** another connection is accepted while 16 accepted connections remain active
- **THEN** the listener SHALL close the excess connection without reading or dispatching a request
- **AND** existing connections and listener availability SHALL remain intact.
