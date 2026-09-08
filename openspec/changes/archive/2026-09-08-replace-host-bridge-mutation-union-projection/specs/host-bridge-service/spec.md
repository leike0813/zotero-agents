## ADDED Requirements

### Requirement: Host Bridge exposes typed canonical mutation capabilities
The service SHALL expose one capability for each public `MutationOperation` value, with an independent operation-specific input and result schema. It SHALL retain read-only `mutation.get_operation` and SHALL NOT expose `mutation.preview` or `mutation.execute`.

#### Scenario: Agent invokes a typed mutation
- **WHEN** an authenticated client calls a capability named by a public mutation operation
- **THEN** the Bridge validates that operation's schema and delegates to the canonical Broker mutation path
- **AND** it does not create or consult generic HTTP operation history.

### Requirement: Dry-run projections are effect-free
Typed mutation capabilities SHALL accept optional `dryRun`; true SHALL invoke Broker preview without durable admission or Zotero mutation, and false or omission SHALL execute through the existing canonical authority.

#### Scenario: Client requests a dry run
- **WHEN** a typed mutation request contains `dryRun: true`
- **THEN** the Bridge returns that operation's preview result without requiring an operation id or approval.
