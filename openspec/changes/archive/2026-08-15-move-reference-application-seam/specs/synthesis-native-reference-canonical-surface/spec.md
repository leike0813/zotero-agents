## MODIFIED Requirements

### Requirement: Canonical mutations SHALL be coherent and durable

Canonical merge, metadata, archive, revision review, and merge-request operations SHALL be planned and projected by the Reference application owner and committed through a dedicated high-level canonical persistence interface. Every durable write MUST receive a caller-supplied promotion checkpoint. Multi-operation requests MUST honor their public validation and atomicity contract without exposing repository owners, locks, transaction closures, table records, or maintenance lifecycle records across the application seam.

#### Scenario: A canonical batch is valid
- **WHEN** every command matches the captured basis, passes validation, and passes its promotion checkpoint
- **THEN** the canonical persistence adapter commits the batch, dependent cache-stale facts, and durable receipt in one atomic operation
- **AND** the application returns a compatible typed result.

#### Scenario: A command is stale or invalid
- **WHEN** any required precondition fails
- **THEN** the application returns the stable conflict or validation result
- **AND** it does not apply an unauthorized partial canonical mutation.

#### Scenario: Promotion is no longer permitted
- **WHEN** the caller-supplied checkpoint rejects a durable Canonical Reference write
- **THEN** the application returns the stable stopping or cancellation outcome
- **AND** it performs no durable mutation or terminal maintenance transition.

## ADDED Requirements

### Requirement: Reference semantic projections SHALL have one application owner

Reference index, ranking, attention, review, and workbench projections SHALL be selected, ordered, paginated, and interpreted by the grouped Reference application owner. Runtime adapters SHALL only decode requests and encode the compatible public representation.

#### Scenario: A Reference projection is requested
- **WHEN** a runtime route supplies a valid typed projection query
- **THEN** the application returns a typed semantic projection from one coherent durable basis
- **AND** no projection selection, ranking, or effective-identity rule is reimplemented in the runtime adapter.
