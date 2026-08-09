## ADDED Requirements

### Requirement: Host Bridge SHALL expose executable capability contracts under protocol v2
The Host Bridge SHALL expose `/bridge/v2`, advertise `host-bridge.v2`, and use one canonical capability contract as the runtime source for capability input Schema, output Schema, effect, and approval policy.

#### Scenario: Valid capability call crosses every contract boundary
- **WHEN** an authenticated client calls a registered capability with valid input
- **THEN** Host Bridge SHALL validate input before permission evaluation
- **AND** SHALL resolve effect and approval policy from the capability contract
- **AND** SHALL validate the handler result before returning success.

#### Scenario: Input is invalid
- **WHEN** capability input is missing a required field, has the wrong type, or contains an undeclared field
- **THEN** Host Bridge SHALL return `invalid_capability_input`
- **AND** SHALL NOT request permission, invoke the handler, mutate state, or consume a handle.

#### Scenario: Handler output violates the contract
- **WHEN** a handler returns data that does not satisfy its declared output Schema
- **THEN** Host Bridge SHALL return `capability_output_contract_violation`
- **AND** SHALL NOT represent the result as a successful capability call.

### Requirement: Host Bridge capability registration SHALL be closed
The registered handler IDs and canonical capability IDs SHALL be identical, and handlers SHALL be invocable only through the validating dispatcher.

#### Scenario: Registry and contract differ
- **WHEN** a capability or handler is missing, duplicated, or orphaned
- **THEN** Host Bridge startup and contract validation SHALL fail before serving requests.

## REMOVED Requirements

### Requirement: Host Bridge service exposes HTTP JSON v1
**Reason**: Capability inputs, outputs, effects, and approval policy now form a breaking executable v2 contract.

**Migration**: Clients must use `/bridge/v2`, require `host-bridge.v2`, and consume the v2 manifest.
