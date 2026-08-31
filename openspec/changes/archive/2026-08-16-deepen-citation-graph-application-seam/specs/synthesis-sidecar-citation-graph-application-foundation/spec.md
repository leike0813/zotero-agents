## ADDED Requirements

### Requirement: Citation Graph application reads SHALL be basis-bound and repository-neutral

The Citation Graph application SHALL expose typed graph reads through an opaque basis-bound view, SHALL return only application projections, and SHALL NOT expose repository records, locks, SQL, transaction closures, or persistence ownership to callers. Every page, continuation, neighborhood, metrics, and layout read SHALL validate the graph basis and normalized query identity before returning data.

#### Scenario: A continuation is used after its basis changes
- **WHEN** a caller continues a graph window after the active graph or normalized query identity changes
- **THEN** the application returns `basis_mismatch`
- **AND** it does not return a page containing rows from both bases

#### Scenario: Several projections are read from one view
- **WHEN** a caller reads graph rows, metrics identity, and layout identity through one basis-bound view
- **THEN** every returned projection identifies the same active graph basis
- **AND** no repository representation crosses the application interface

### Requirement: Citation Graph promotion SHALL atomically settle graph state and its internal operation

The Citation Graph application SHALL commit graph rows and application state, Citation Graph cache basis, and the terminal state of its private graph operation in one SQLite transaction. It SHALL return only a typed graph outcome; public maintenance admission, running state, terminal state, retry, continue, events, and restart reconciliation SHALL remain outside this operation.

#### Scenario: Promotion fails before commit
- **WHEN** graph replacement, cache-basis persistence, internal-operation settlement, or transaction commit fails
- **THEN** the last-good graph, previous cache basis, and previous internal-operation state remain mutually consistent

#### Scenario: Promotion commits before public lifecycle settlement
- **WHEN** graph promotion commits and the process stops before the public maintenance operation becomes terminal
- **THEN** the committed graph remains readable after restart
- **AND** public restart reconciliation independently classifies the public operation without application-side repair

### Requirement: Every dispatched graph execution SHALL use a fresh opaque attempt

The Citation Graph application SHALL create a new private attempt for each execution actually dispatched by the public lifecycle winner. Application callers SHALL NOT provide or inspect public maintenance operation identities, retry keys, predecessors, or persistence records.

#### Scenario: A public retry successor is dispatched
- **WHEN** the public maintenance lifecycle dispatches an explicit retry successor
- **THEN** the application creates a new graph attempt and captures current facts
- **AND** it does not resume or mutate the predecessor graph attempt

