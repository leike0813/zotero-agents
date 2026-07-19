# synthesis-workbench-topic-command-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for topic command operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Workbench Topic commands use the Topics client capability

The Synthesis client SHALL expose commands for Topic artifact deletion, deleted-artifact purge, discovery-hint rejection, and discovery-hint restoration. The Workbench SHALL lazily resolve the default client and SHALL NOT call the corresponding legacy service methods directly.

#### Scenario: Workbench applies a Topic command
- **WHEN** a user deletes or purges Topic artifacts or rejects or restores a discovery hint
- **THEN** the Workbench SHALL invoke the corresponding `client.topics` method
- **AND** the result SHALL cross the client boundary as an opaque JSON-safe object

### Requirement: Topic command request DTOs are strict and bounded

A Topic artifact delete request SHALL contain a non-empty, trimmed `topicId`. A discovery-hint request SHALL contain a non-empty, trimmed `hintId`. Unknown JSON-safe request fields SHALL NOT be forwarded. Purge SHALL be a no-argument command.

#### Scenario: Identifier request is valid
- **WHEN** a delete or discovery-hint request contains its required non-empty string identifier
- **THEN** the adapter SHALL invoke the corresponding port with a rebuilt request containing only the trimmed canonical identifier

#### Scenario: Identifier request is invalid
- **WHEN** the request is not JSON-safe, the required identifier is absent or not a string, or the identifier is empty after trimming
- **THEN** the adapter SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke or resolve the legacy port

#### Scenario: Purge is invoked
- **WHEN** deleted Topic artifacts are purged
- **THEN** the adapter SHALL invoke the purge port without request data, callbacks, or streaming state

### Requirement: In-process Topic commands normalize ports, results, and errors

The in-process adapter SHALL depend on four narrow legacy Topic ports. It SHALL validate and rebuild identifier requests before resolving ports, normalize each returned value through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error and `storage_busy`, and normalize an ordinary exception to `internal`.

#### Scenario: Legacy Topic command succeeds
- **WHEN** a configured Topic port returns a result containing values handled by shared JSON normalization
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Legacy Topic command port is absent
- **WHEN** a caller invokes a Topic command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Legacy Topic command fails
- **WHEN** a configured Topic port throws an ordinary exception
- **THEN** the adapter SHALL reject with `internal`

#### Scenario: Topic domain failure is a valid result
- **WHEN** a port returns delete not-found, discovery-hint not-found, or plural diagnostics
- **THEN** the adapter SHALL return that normalized object
- **AND** it SHALL NOT rewrite the object as a client error

### Requirement: Existing Workbench Topic behavior is preserved

The client-routed commands SHALL preserve identifier trimming, confirmation, command single-flight, delete failure handling, singular diagnostic handling, immediate start, and existing surface invalidation. The client contract SHALL NOT carry progress callbacks or streaming state.

#### Scenario: Topic artifact deletion runs
- **WHEN** the deletion confirmation is accepted
- **THEN** deletion SHALL retain its `{ topicId }` single-flight arguments and call the Topics client immediately
- **AND** a returned result with `ok: false` SHALL still surface its domain reason as a Workbench error

#### Scenario: Deleted artifacts are purged
- **WHEN** the purge confirmation is accepted
- **THEN** purge SHALL retain its empty single-flight arguments and call the no-argument Topics client immediately

#### Scenario: Discovery hint action runs
- **WHEN** a non-empty hint identifier is rejected or restored
- **THEN** the action SHALL retain its `{ hintId }` single-flight arguments and singular-only `failOnDiagnostic` handling
- **AND** plural diagnostics SHALL remain a legal result

#### Scenario: Topic command settles
- **WHEN** delete or purge completes or fails
- **THEN** the Workbench SHALL invalidate Home and Topics
- **AND** discovery-hint actions SHALL retain default selected-surface invalidation

### Requirement: Migration boundaries remain stable

This migration SHALL retain 125 public Synthesis service methods, exactly four direct legacy service consumers, and current process, repository, persistence, autosync, Host Bridge, MCP, and domain ownership.

#### Scenario: Static service boundaries are checked
- **WHEN** service inventory and direct-consumer checks run
- **THEN** the public service method count SHALL remain 125
- **AND** direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope Topic operations are inspected
- **WHEN** the migration is reviewed
- **THEN** Topic queries, Topic Graph commands, Topic mirror operations, Tag, Sync, Topic synthesis workflow, Host Bridge, and MCP paths SHALL remain unchanged
