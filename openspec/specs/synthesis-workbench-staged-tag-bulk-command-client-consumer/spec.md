# synthesis-workbench-staged-tag-bulk-command-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for staged tag bulk command operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Staged Tag bulk capability uses a strict selection contract

The system SHALL expose staged Tag promotion and discard through one JSON-safe selection DTO and staged clear through a no-argument command, with all three returning opaque JSON objects.

#### Scenario: A non-empty selection is canonicalized
- **WHEN** a caller supplies a JSON-safe object whose `tags` array contains strings that are non-empty after trimming
- **THEN** the adapter forwards only the trimmed `tags` array while preserving member order and duplicates

#### Scenario: An empty selection is supplied
- **WHEN** a caller supplies `{ tags: [] }`
- **THEN** the client forwards the empty array as a legal no-op selection

#### Scenario: A selection is invalid
- **WHEN** the request is not JSON-safe, omits the `tags` array, or contains a non-string or blank member
- **THEN** the client rejects it with `invalid_request` before resolving or invoking the legacy port

### Requirement: In-process staged Tag ports normalize the legacy boundary

The in-process adapter SHALL invoke narrow optional promote, discard, and clear ports, normalize successful results as JSON objects, and use stable client error categories.

#### Scenario: A port returns a legal domain result
- **WHEN** promote, discard, or clear returns a JSON-safe object, including a promote result with plural diagnostics
- **THEN** the adapter returns the normalized object without converting domain diagnostics into client failure

#### Scenario: A port is unavailable or fails
- **WHEN** a port is missing, throws a known client error, reports storage busy, throws an ordinary exception, or returns a non-object result
- **THEN** the adapter maps the outcome respectively to `unavailable`, the preserved client error, `storage_busy`, or `internal`

### Requirement: Workbench staged bulk actions use the Tag client

The Workbench SHALL lazily resolve the default Synthesis client inside each staged bulk single-flight closure and SHALL not directly resolve the legacy service from the promote, bulk-discard, or clear host-command branches.

#### Scenario: Promote or discard has normalized tags
- **WHEN** the Workbench receives a `tags` array or singular `tag` with at least one non-empty normalized value
- **THEN** it calls the matching client method immediately with the normalized selection and retains `{ tag: tags[0], tags }` as the single-flight arguments

#### Scenario: Promote or discard has no normalized tags
- **WHEN** the Workbench selection normalizes to an empty array
- **THEN** it skips client resolution and refreshes the active cached surface without a service read

#### Scenario: Clear runs
- **WHEN** the Workbench executes `clearStagedTagSuggestions`
- **THEN** it calls the no-argument client method immediately with empty single-flight arguments even when the staged inbox is already empty

#### Scenario: A staged bulk command completes
- **WHEN** promote, discard, or clear returns normally
- **THEN** the Workbench invalidates only the Tags surface without confirmation, deferred start, progress callback, streaming, or singular diagnostic transformation

### Requirement: Workflow Host compatibility remains stable

The migration SHALL retain the Workflow Host's twelve use-case methods and SHALL keep its empty discard selection valid without changing notification semantics.

#### Scenario: Workflow Host discards an empty selection
- **WHEN** the Workflow Host calls `discardStagedTagSuggestions({ tags: [] })`
- **THEN** the typed client call remains valid and returns the underlying no-op result

#### Scenario: Boundary inventory is checked
- **WHEN** repository boundary checks run after the migration
- **THEN** the Synthesis service still exposes 125 public methods and has four approved direct consumers
