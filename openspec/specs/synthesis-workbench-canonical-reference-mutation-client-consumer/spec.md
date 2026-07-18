## ADDED Requirements

### Requirement: Canonical Reference mutations use a bounded client capability
The Synthesis client SHALL expose Reference commands for single effective canonical merge, batch canonical merge, canonical metadata update, and canonical archive. The Workbench SHALL lazily resolve the default client and SHALL NOT call the corresponding legacy service methods directly.

#### Scenario: Workbench applies a canonical Reference mutation
- **WHEN** a user merges canonical References, applies canonical revision merge requests, updates canonical metadata, or archives a canonical Reference
- **THEN** the Workbench SHALL invoke the corresponding `client.references` method
- **AND** the result SHALL cross the client boundary as an opaque JSON-safe object

### Requirement: Canonical merge request contracts are strict
A canonical merge pair SHALL contain non-empty, trimmed `sourceEffectiveCanonicalId` and `targetEffectiveCanonicalId` values. A single merge MAY contain boolean `confirmRetargetGroup`, whose omitted semantics SHALL be false. A batch merge SHALL contain at least one strict merge pair. Equal identifiers SHALL cross the adapter boundary so the legacy domain can return its established failure result.

#### Scenario: Single canonical merge is valid
- **WHEN** a request contains two non-empty effective canonical identifiers and an optional boolean confirmation
- **THEN** the adapter SHALL invoke the single merge port with a rebuilt request containing only known fields

#### Scenario: Batch canonical merge is valid
- **WHEN** a request contains at least one strict canonical merge pair
- **THEN** the adapter SHALL invoke the batch merge port with rebuilt pairs

#### Scenario: Canonical merge request is invalid
- **WHEN** a pair has an empty identifier, a batch is empty, a member is invalid, or confirmation is not boolean
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke the legacy port

### Requirement: Canonical metadata and archive contracts are bounded
Metadata update SHALL contain a non-empty `canonicalReferenceId` and a patch containing only optional `title`, `normalizedTitle`, `year`, `authors: string[]`, and `identifiers: Record<string, string>` fields. Archive SHALL contain a non-empty `canonicalReferenceId`. Empty patches, empty authors arrays, and empty identifiers objects SHALL be valid. Strings, author entries, and identifier entries SHALL be trimmed and SHALL be non-empty after trimming. Unknown JSON-safe patch fields SHALL NOT be forwarded, and invalid field types SHALL reject with `invalid_request`.

#### Scenario: Metadata patch is valid
- **WHEN** a metadata request contains supported fields with valid string, author, and identifier values
- **THEN** the adapter SHALL invoke the metadata port with a rebuilt and trimmed patch

#### Scenario: Empty metadata patch is valid
- **WHEN** a metadata request contains an empty patch
- **THEN** the adapter SHALL invoke the metadata port with an empty patch

#### Scenario: Metadata or archive request is invalid
- **WHEN** a canonical Reference identifier is empty or a supported metadata field has an invalid type or empty nested entry
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke the legacy port

### Requirement: In-process canonical Reference mutations normalize ports, results, and errors
The in-process adapter SHALL depend on four narrow legacy canonical Reference mutation ports. It SHALL validate and rebuild a request before resolving its port, normalize each successful result through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error and `storage_busy`, and normalize an ordinary legacy exception to `internal`.

#### Scenario: Legacy canonical Reference command succeeds
- **WHEN** a configured mutation port returns a result containing values handled by the shared JSON normalization rules
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Legacy canonical Reference command port is absent
- **WHEN** a caller invokes a canonical Reference mutation whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Legacy canonical Reference command fails
- **WHEN** a configured mutation port throws an ordinary exception
- **THEN** the adapter SHALL reject with `internal`

#### Scenario: Domain failure is a valid result
- **WHEN** a configured mutation port returns a legal same-ID, confirmation, binding, blocking, batch failure, or plural `diagnostics` result
- **THEN** the adapter SHALL return that normalized object
- **AND** it SHALL NOT rewrite the object as a client error

### Requirement: Existing Workbench canonical mutation behavior is preserved
The client-routed actions SHALL preserve snake_case and camelCase identifier aliases, whitespace trimming, boolean confirmation coercion, batch object filtering and canonical mapping, metadata patch defaulting and normalized-title alias mapping, command single-flight, singular `diagnostic` handling, and existing surface invalidation. Only batch merge SHALL retain deferred start. The actions SHALL NOT add confirmation dialogs or progress callbacks.

#### Scenario: Workbench normalizes canonical mutation payloads
- **WHEN** a Workbench action receives aliased or whitespace-padded identifiers, a batch containing non-object entries, or a metadata patch using `normalized_title`
- **THEN** it SHALL construct the corresponding canonical client request with trimmed identifiers and normalized patch fields

#### Scenario: Canonical mutation action runs
- **WHEN** any migrated action enters `runWorkbenchCommandOnce`
- **THEN** it SHALL retain its existing single-flight key and `.then(failOnDiagnostic)` chain
- **AND** only batch merge SHALL use `deferStart: true`
- **AND** no migrated action SHALL add confirmation or progress callbacks

#### Scenario: Merge action settles
- **WHEN** single or batch canonical merge completes or fails
- **THEN** the Workbench SHALL invalidate Index, Review, and Graph surfaces as before

#### Scenario: Metadata or archive action settles
- **WHEN** metadata update or archive completes or fails
- **THEN** the Workbench SHALL invalidate Index and Review surfaces as before

#### Scenario: Returned plural diagnostics are inspected
- **WHEN** a valid command result contains `diagnostics` but no singular `diagnostic`
- **THEN** the existing `failOnDiagnostic` helper SHALL retain its current singular-only behavior

### Requirement: Migration boundaries remain stable
This migration SHALL retain 125 public Synthesis service methods, exactly four direct legacy service consumers, all existing public Reference service methods, and current process, repository, persistence, Host Bridge, MCP, and domain ownership.

#### Scenario: Static service boundaries are checked
- **WHEN** service inventory and direct-consumer checks run
- **THEN** the public service method count SHALL remain 125
- **AND** direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope operations are inspected
- **WHEN** the migration is reviewed
- **THEN** Reference queries, Tag, Concept, Topic Graph, Git/WebDAV Sync, Topic artifacts, Host Bridge, and MCP SHALL remain on their current paths
