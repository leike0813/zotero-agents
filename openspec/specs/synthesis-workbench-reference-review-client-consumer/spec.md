# synthesis-workbench-reference-review-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for reference review operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Reference review actions use a bounded client capability

The Synthesis client SHALL expose Reference commands for canonical revision review, a single match proposal action, and batch match proposal decisions. The Workbench SHALL lazily resolve the default client and SHALL NOT call the corresponding legacy service methods directly.

#### Scenario: Workbench applies a Reference review action
- **WHEN** a user reviews a canonical revision or acts on one or more Reference match proposals
- **THEN** the Workbench SHALL invoke the corresponding `client.references` method
- **AND** the result SHALL cross the client boundary as an opaque JSON-safe object

### Requirement: Reference review request contracts are strict

Canonical review requests SHALL contain a non-empty `reviewItemId` and `accept | reject`. Single proposal requests SHALL contain a non-empty `proposalId` and `accept | reverse_accept | reject | reopen | delete`. Batch requests SHALL contain at least one proposal decision, MAY additionally use `manual_target`, and SHALL represent its target as either a positive-integer Zotero `libraryId` with a non-empty `itemKey` or a non-empty `canonicalReferenceId`.

#### Scenario: Canonical revision review is valid
- **WHEN** a request contains a non-empty review item identifier and an allowed canonical review action
- **THEN** the adapter SHALL invoke the canonical revision review port with a rebuilt request containing only those known fields

#### Scenario: Proposal action is valid
- **WHEN** a request contains a non-empty proposal identifier and an allowed single proposal action
- **THEN** the adapter SHALL invoke the single proposal action port with a rebuilt request containing only those known fields

#### Scenario: Manual Zotero target is valid
- **WHEN** a batch decision uses `manual_target` with a positive-integer `libraryId` and a non-empty `itemKey`
- **THEN** the adapter SHALL pass a rebuilt Zotero target to the batch proposal port

#### Scenario: Manual canonical target is valid
- **WHEN** a batch decision uses `manual_target` with a non-empty `canonicalReferenceId`
- **THEN** the adapter SHALL pass a rebuilt canonical Reference target to the batch proposal port

#### Scenario: Reference review request is invalid
- **WHEN** a request has an empty identifier, an unsupported action, an empty batch, an invalid target discriminator, or a non-positive or non-integer `libraryId`
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke the legacy port

### Requirement: In-process Reference review commands normalize ports, results, and errors

The in-process adapter SHALL depend on three narrow legacy Reference review/proposal ports. It SHALL normalize each successful result through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error and `storage_busy`, and normalize an ordinary legacy exception to `internal`.

#### Scenario: Legacy Reference review command succeeds
- **WHEN** a configured review/proposal port returns a result containing values handled by the shared JSON normalization rules
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Legacy Reference review command port is absent
- **WHEN** a caller invokes a Reference review/proposal command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Legacy Reference review command fails
- **WHEN** a configured review/proposal port throws an ordinary exception
- **THEN** the adapter SHALL reject with `internal`

#### Scenario: Batch domain failure is a valid result
- **WHEN** a configured batch proposal port returns a legal failure result or plural `diagnostics`
- **THEN** the adapter SHALL return that normalized object
- **AND** it SHALL NOT rewrite the object as a client error

### Requirement: Existing Workbench review behavior is preserved

The client-routed actions SHALL preserve snake_case and camelCase aliases, whitespace trimming, default actions, batch filtering, command single-flight, singular `diagnostic` handling, and Index, Review, and Graph surface invalidation. They SHALL NOT add confirmation, deferred start, or progress callbacks.

#### Scenario: Workbench normalizes review payloads
- **WHEN** a Workbench action receives aliased or whitespace-padded identifiers and omitted defaultable actions
- **THEN** it SHALL construct the same trimmed and defaulted client request as the existing service request
- **AND** a batch SHALL retain only decisions with valid non-empty proposal identifiers

#### Scenario: Reference review action runs
- **WHEN** any migrated action enters `runWorkbenchCommandOnce`
- **THEN** it SHALL retain its existing single-flight key and `.then(failOnDiagnostic)` chain
- **AND** it SHALL run without confirmation, `deferStart`, or progress callbacks

#### Scenario: Reference review action settles
- **WHEN** any migrated action completes or fails
- **THEN** the Workbench SHALL invalidate Index, Review, and Graph surfaces as before

#### Scenario: Returned plural diagnostics are inspected
- **WHEN** a valid command result contains `diagnostics` but no singular `diagnostic`
- **THEN** the existing `failOnDiagnostic` helper SHALL retain its current singular-only behavior

### Requirement: Migration boundaries remain stable

This migration SHALL retain 125 public Synthesis service methods, exactly four direct legacy service consumers, all existing public Reference service methods, and current process, repository, persistence, Host Bridge, MCP, and domain ownership.

#### Scenario: Static service boundaries are checked
- **WHEN** service inventory and direct-consumer checks run
- **THEN** the public service method count SHALL remain 125
- **AND** direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope Reference operations are inspected
- **WHEN** the migration is reviewed
- **THEN** canonical merge and batch merge, metadata update, archive, Reference queries and maintenance commands, other Synthesis domains, Host Bridge, and MCP SHALL remain on their current paths
