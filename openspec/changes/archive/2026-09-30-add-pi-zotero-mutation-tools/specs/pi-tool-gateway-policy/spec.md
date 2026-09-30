## MODIFIED Requirements

### Requirement: Exact approval continues one original call

The Gateway SHALL bind permission to owner, original source turn, call identity, name, exact argument digest, catalog and descriptor identity, capability-envelope identity, Runtime Capability Receipt identity and optional domain plan digest. Approval or denial SHALL apply to that original call only. An approved call SHALL continue in a new Runtime Turn without model reissue; current domain facts SHALL be preflighted again. Stale material SHALL produce a replacement pending request carrying the original source turn and current safe admission facts. Denial SHALL never execute, including when bound facts changed. Approval SHALL NOT change standing grants or the active catalog.

#### Scenario: Original call is approved
- **WHEN** an exact matching approval starts a new turn with unchanged bound facts
- **THEN** only that original call is eligible to execute

#### Scenario: Approval binding is stale
- **WHEN** arguments, catalog, envelope, capability receipt or domain plan no longer match
- **THEN** the old approval cannot execute and the returned continuation retains the replacement pending request

#### Scenario: Denial with changed facts
- **WHEN** a denied pending call has changed admission facts
- **THEN** no executor starts

## ADDED Requirements

### Requirement: Trusted domain preflight precedes batch effects

Definitions MAY provide domain preflight returning safe bounded admission facts, a plan digest, and private execution/disposal capabilities. The Gateway SHALL complete the whole batch's preflight before any effect, bind safe facts to permission, and dispose private resources on rejection, defer, cancellation, resource failure, persistence failure and completion. Private prepared state SHALL NOT enter pending DTOs or durable receipts. Structured preflight failures SHALL retain safe codes and details. Schema list-bound violations SHALL return `resource_limited`.

#### Scenario: First call is ready while a later call is preparing
- **WHEN** a batch includes asynchronous domain preflight
- **THEN** no executor begins until all preflights settle

#### Scenario: Prepared attachment waits for permission
- **WHEN** a prepared call is deferred
- **THEN** its private stage is disposed and continuation creates a fresh plan-bound snapshot
