## ADDED Requirements

### Requirement: Staged Tag update capability is strict and environment-neutral
The Synthesis client SHALL expose `updateStagedTagSuggestion` through `client.tags` with a strict JSON-safe request and an opaque `SynthesisTagCommandResult`. `originalTag`, `tag`, `facet`, and `sourceFlow` SHALL be non-empty after trimming; `note` SHALL be a string and MAY trim to empty; `parentBindings` SHALL be an array containing only positive integers.

#### Scenario: A valid update crosses the client boundary
- **WHEN** a consumer supplies all required fields with valid JSON-safe values
- **THEN** the adapter invokes the narrow legacy port with trimmed strings and parent bindings deduplicated in ascending order
- **AND** unknown request fields are not forwarded

#### Scenario: An invalid update is rejected before port resolution
- **WHEN** a required string is empty, note is not a string, parent bindings is not an array, or a binding is not a positive integer
- **THEN** the adapter rejects with `invalid_request`
- **AND** it does not resolve or invoke the legacy port

### Requirement: In-process staged Tag update normalizes results and errors
The in-process adapter SHALL normalize a successful staged Tag update as an opaque JSON-safe object and SHALL preserve stable client error categories.

#### Scenario: The legacy port returns a valid command result
- **WHEN** the configured port resolves with a JSON-safe object result
- **THEN** the client returns its normalized opaque object representation

#### Scenario: The legacy boundary is unavailable or fails
- **WHEN** the port is missing, throws an existing client error, reports storage busy, throws an ordinary exception, or returns an invalid result
- **THEN** the adapter respectively returns `unavailable`, preserves the existing client code, preserves `storage_busy`, or maps the ordinary/invalid-result failure to `internal`

### Requirement: Staged Tag updates are atomic domain mutations
The Tag Vocabulary domain SHALL read, merge, delete, and write staged Tag rows within one repository transaction. Any exception SHALL roll back the complete update. The service SHALL delegate to the domain without canonical autosync, and staged suggestions SHALL remain exempt from TagVocab protocol validation.

#### Scenario: The original row is missing
- **WHEN** no staged row matches `originalTag`
- **THEN** the domain upserts a new row using the complete request

#### Scenario: The tag is unchanged
- **WHEN** `originalTag` and `tag` identify the same staged row
- **THEN** the domain merges the request into that row without a delete-then-stage gap

#### Scenario: A rename has no target
- **WHEN** the original exists and no staged row matches the requested target tag case-insensitively
- **THEN** the domain deletes the original and creates a new row entirely from the request
- **AND** it does not implicitly inherit information absent from the request

#### Scenario: A rename collides with a target
- **WHEN** an exact or case-insensitive target row already exists
- **THEN** the domain merges into that target, uses the requested tag casing, and removes the original and every other case variant

#### Scenario: A repository write fails
- **WHEN** any repository operation fails after the transaction starts
- **THEN** the original and target rows remain exactly as they were before the command

### Requirement: Collision merges preserve deterministic field semantics
The staged Tag update SHALL let non-empty requested `facet` and `sourceFlow` replace target values, let a non-empty requested note replace the target note, preserve an existing target note for an empty requested note, and store the sorted union of target and requested parent bindings. A collision merge SHALL preserve target `created_at`; a new row or target-free rename SHALL receive a new `created_at`; every successful update SHALL refresh `updated_at`.

#### Scenario: Existing target fields are merged
- **WHEN** the requested tag collides with an existing target
- **THEN** the survivor has request casing, request facet and source flow, the applicable note value, unioned parent bindings, the target creation timestamp, and a refreshed update timestamp

#### Scenario: A replacement row is created
- **WHEN** a missing original is upserted or a rename has no target
- **THEN** the new row receives fresh creation and update timestamps and contains the complete request fields

### Requirement: Workbench staged Tag edit uses the client without orchestration changes
The Workbench SHALL lazily resolve the default Synthesis client inside the existing single-flight closure and SHALL call `client.tags.updateStagedTagSuggestion` instead of directly discarding and staging suggestions.

#### Scenario: Host payload is normalized
- **WHEN** the Workbench receives a staged Tag edit payload
- **THEN** `originalTag` falls back to `tag`, facet falls back to the tag prefix and then `topic`, `source_flow` and `parent_bindings` remain accepted, and source flow defaults to `tag-regulator-suggest`

#### Scenario: A normalized edit runs
- **WHEN** the normalized tag is non-empty
- **THEN** the command retains `{ tag }` single-flight arguments, starts immediately, adds no confirmation, defer, progress, streaming, or `failOnDiagnostic` behavior, and invalidates only Tags

#### Scenario: The normalized tag is empty
- **WHEN** the normalized tag trims to empty
- **THEN** the Workbench skips the command before resolving the client

### Requirement: Migration boundaries remain explicit
The migration SHALL expose 126 public Synthesis service methods, retain exactly four approved direct service consumers, and SHALL NOT migrate or alter generic staging, promotion, bulk discard/clear, Tag import, audit, vocabulary entry edit/delete, Host Bridge, or MCP.

#### Scenario: Static boundaries are checked
- **WHEN** service inventory and direct-consumer checks run
- **THEN** the new method is classified as `tag_commands / knowledge.tags / client_capability`
- **AND** the Workbench staged update branch contains no direct `stageTagSuggestions` or `discardStagedTagSuggestions` call
