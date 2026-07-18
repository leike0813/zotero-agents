## ADDED Requirements

### Requirement: Workbench Concept commands use a bounded client capability
The Synthesis client SHALL expose Concept commands for Concept KB rebuild, display-text update, review action, and deletion. The Workbench SHALL lazily resolve the default client and SHALL NOT call the corresponding legacy service methods directly.

#### Scenario: Workbench applies a Concept command
- **WHEN** a user rebuilds the Concept index, updates Concept display text, resolves a Concept review, or deletes Concepts
- **THEN** the Workbench SHALL invoke the corresponding `client.concepts` method
- **AND** the result SHALL cross the client boundary as an opaque JSON-safe object

### Requirement: Concept display-text requests are strict and bounded
A display-text update SHALL contain a non-empty, trimmed `conceptId` and at least one of `short_definition`, `definition`, `usage_note`, or `editorial_note`. Field values SHALL be strings and SHALL be trimmed. Empty strings SHALL remain valid clearing values. Unknown JSON-safe fields SHALL NOT be forwarded.

#### Scenario: Display-text update is valid
- **WHEN** a request contains a non-empty Concept identifier and one or more supported string fields
- **THEN** the adapter SHALL invoke the display-text port with a rebuilt request containing only trimmed known fields

#### Scenario: Display-text clearing is valid
- **WHEN** a supported display field trims to an empty string
- **THEN** the adapter SHALL preserve the empty string for the Concept domain to clear that field

#### Scenario: Display-text update is invalid
- **WHEN** the Concept identifier is empty, a supported field is not a string, or no supported field is present
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke the legacy port

### Requirement: Concept review and deletion requests are strict
A Concept review request SHALL contain a non-empty, trimmed `reviewId`, one of `approve_create | merge_into_existing | reject`, and MAY contain a non-empty, trimmed `targetConceptId`. A deletion request SHALL contain at least one non-empty, trimmed Concept identifier.

#### Scenario: Concept review request is valid
- **WHEN** a request contains a non-empty review identifier, an allowed action, and an optional valid target
- **THEN** the adapter SHALL invoke the review port with a rebuilt canonical request

#### Scenario: Merge target is omitted
- **WHEN** a `merge_into_existing` review request omits `targetConceptId`
- **THEN** the adapter SHALL invoke the review port without a target
- **AND** any missing-target diagnostic SHALL remain a domain result

#### Scenario: Concept deletion request is valid
- **WHEN** a request contains one or more non-empty Concept identifiers
- **THEN** the adapter SHALL invoke the deletion port with a rebuilt trimmed array

#### Scenario: Concept review or deletion request is invalid
- **WHEN** an identifier is empty, an action is unsupported, a provided target is empty, a deletion batch is empty, or a deletion member is not a string
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke the legacy port

### Requirement: In-process Concept commands normalize ports, results, and errors
The in-process adapter SHALL depend on four narrow legacy Concept ports. It SHALL validate and rebuild requests before resolving ports, normalize each successful result through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error and `storage_busy`, and normalize an ordinary legacy exception to `internal`.

#### Scenario: Legacy Concept command succeeds
- **WHEN** a configured Concept port returns a result containing values handled by shared JSON normalization
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Legacy Concept command port is absent
- **WHEN** a caller invokes a Concept command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Legacy Concept command fails
- **WHEN** a configured Concept port throws an ordinary exception
- **THEN** the adapter SHALL reject with `internal`

#### Scenario: Concept domain failure is a valid result
- **WHEN** a configured port returns a missing/closed review, missing merge target, delete not-found, or diagnostic-bearing result
- **THEN** the adapter SHALL return that normalized object
- **AND** it SHALL NOT rewrite the object as a client error

### Requirement: Existing Workbench Concept behavior is preserved
The client-routed commands SHALL preserve identifier trimming, review action filtering, optional target handling, deletion aliases, command single-flight, protected rebuild confirmation, deferred start, singular diagnostic handling, and Concepts/Review invalidation. The client contract SHALL NOT carry progress callbacks or streaming state.

#### Scenario: Concept KB rebuild runs
- **WHEN** the protected rebuild command is confirmed
- **THEN** it SHALL retain its existing single-flight key and `deferStart: true`
- **AND** it SHALL call the no-argument Concepts client rebuild method
- **AND** progress SHALL continue through the existing persisted Workbench progress poll

#### Scenario: Concept mutation runs
- **WHEN** display text, review, or deletion enters `runWorkbenchCommandOnce`
- **THEN** it SHALL retain existing normalized arguments and immediate start behavior
- **AND** only review action SHALL retain `.then(failOnDiagnostic)`

#### Scenario: Concept command settles
- **WHEN** any migrated Concept command completes or fails
- **THEN** the Workbench SHALL invalidate Concepts and Review surfaces as before

### Requirement: Migration boundaries remain stable
This migration SHALL retain 125 public Synthesis service methods, exactly four direct legacy service consumers, all existing public Concept service methods, and current process, repository, persistence, autosync, Host Bridge, MCP, and domain ownership.

#### Scenario: Static service boundaries are checked
- **WHEN** service inventory and direct-consumer checks run
- **THEN** the public service method count SHALL remain 125
- **AND** direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope Concept operations are inspected
- **WHEN** the migration is reviewed
- **THEN** Concept queries and checkpoint export, Tag, Topic Graph, Sync, Topic artifact, Host Bridge, and MCP paths SHALL remain unchanged
