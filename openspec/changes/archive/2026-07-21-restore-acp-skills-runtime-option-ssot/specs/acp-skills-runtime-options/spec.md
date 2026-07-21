## ADDED Requirements

### Requirement: Run-Effective Runtime Options

ACP Skills SHALL persist each run's effective mode, model, raw model, and reasoning selection in the run record. The persisted run selection SHALL be the sole current-value source used by execution, recovery, and UI projection.

#### Scenario: Submitted selection survives a different handshake default

- **GIVEN** a workflow is submitted with model B
- **AND** the backend cache or new session reports model A as its current default
- **WHEN** the runner creates the session and sends the first prompt
- **THEN** it SHALL apply and execute model B
- **AND** the persisted run and composer SHALL display model B.

#### Scenario: Real observed current initializes an absent selection

- **GIVEN** a newly created run has no submitted selection for a runtime category
- **WHEN** the session handshake reports a real current value for that category
- **THEN** ACP Skills SHALL initialize that absent run field from the observed current value
- **AND** later execution and UI projection SHALL read the initialized run field.

#### Scenario: Catalog order does not invent a current selection

- **GIVEN** a run has no selection for a runtime category
- **AND** its catalog contains choices but exposes no real current value
- **WHEN** ACP Skills projects the run
- **THEN** the run SHALL remain unselected or Default for that category
- **AND** ACP Skills SHALL NOT select the first catalog choice as current.

#### Scenario: Successful run-scoped edit changes the effective selection

- **GIVEN** a waiting run currently uses model B
- **WHEN** the user changes the model to C and the remote setter succeeds
- **THEN** ACP Skills SHALL atomically persist model C as the run-effective selection
- **AND** subsequent execution and UI projection SHALL use model C.

### Requirement: ACP Runtime Catalog Is Shared Without Sharing Current Ownership

ACP Chat and ACP Skills SHALL share protocol-generic runtime catalog normalization without sharing ownership of current values. ACP Chat current values SHALL be owned by its live session configuration. ACP Skills current values SHALL be owned by the persisted run-effective selection.

#### Scenario: Skills live catalog complements a persisted selection

- **WHEN** an ACP Skills session exposes live choices for a category
- **AND** the run already contains an effective selection for that category
- **THEN** the live choices SHALL update the run's catalog
- **AND** the live current or cached default SHALL NOT replace the persisted selection.

#### Scenario: Chat current remains live-session owned

- **WHEN** ACP Chat has live session configuration for a runtime category
- **THEN** its live choices and current value SHALL drive Chat projection
- **AND** ACP Skills run ownership SHALL NOT alter Chat precedence.

#### Scenario: Successful Skills setter has one state transition

- **WHEN** a run-scoped ACP Skills runtime setter succeeds
- **THEN** ACP Skills SHALL update the persisted run-effective fields in one state transition
- **AND** it SHALL NOT maintain a second writable per-run current snapshot.

## REMOVED Requirements

### Requirement: Frozen Run Runtime Options

**Reason**: The requirement described submission-time state but did not govern successful later user edits, allowing a second snapshot to replace persisted run state.

**Migration**: Use `Run-Effective Runtime Options`, which initializes at submission and changes only after a successful run-scoped setter or an existing absent-selection fallback.

### Requirement: ACP Runtime Option State Has Canonical Precedence

**Reason**: A single current-value precedence rule lets live Skills handshake defaults replace the persisted run-effective selection even though Chat and Skills have different state owners.

**Migration**: Use `ACP Runtime Catalog Is Shared Without Sharing Current Ownership`; share catalog normalization while keeping Chat current live-session owned and Skills current run owned.
