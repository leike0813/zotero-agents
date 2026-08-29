## ADDED Requirements

### Requirement: Resolved public maintenance routes SHALL enter one lifecycle interface

The validated production catalog SHALL be the only source that combines a maintenance capability handler with its manifest-owned deadline, semantic-success, receipt, and canonical-effect policy. Production routing SHALL pass an opaque resolved maintenance route into one typed lifecycle interface for submit, control, read, and restart reconciliation. Callers MUST NOT construct handlers or policies, interpret durable records, or orchestrate lifecycle phases.

#### Scenario: Maintenance capability is submitted
- **WHEN** a declared production capability resolves to public maintenance work
- **THEN** routing SHALL submit its typed request and opaque resolved route to the maintenance lifecycle
- **AND** routing SHALL NOT perform durable acceptance, worker spawning, terminal classification, or receipt persistence itself

#### Scenario: Pending work is continued after restart
- **WHEN** a caller explicitly continues a `continuation_required` operation
- **THEN** the lifecycle SHALL reconstruct execution from the persisted stable basis and the current catalog resolution
- **AND** no handler implementation, function pointer, or parallel route discriminator SHALL be persisted

### Requirement: Public maintenance lifecycle views SHALL be transport neutral

The maintenance lifecycle SHALL return a typed operation view containing lifecycle identity, state, phase, scope, progress, timestamps, and an optional opaque capability receipt payload. Existing retry eligibility and sanitized diagnostic codes remain part of the terminal receipt. Persistence records, basis encoding, source hashes, raw diagnostics storage, and wire-specific field aliases MUST NOT cross the lifecycle interface.

#### Scenario: Operation is queried through a production adapter
- **WHEN** a caller reads a public maintenance operation
- **THEN** the lifecycle SHALL return the typed operation view or absence
- **AND** the adapter MAY encode the view for its wire contract without reclassifying status, phase, retry eligibility, or terminal outcome

#### Scenario: Capability returns a domain receipt
- **WHEN** a maintenance handler settles with a capability-specific receipt payload
- **THEN** the catalog-owned semantic-success policy SHALL classify the operation terminal in one place
- **AND** the lifecycle view SHALL preserve the domain payload without treating its internal status as a second lifecycle state
