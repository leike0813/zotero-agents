# synthesis-workbench-tag-import-command-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for tag import command operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Strict Tag import command contracts

The system SHALL expose Tag import preview and apply through strict JSON-safe request objects and SHALL return opaque JSON-safe object results.

#### Scenario: Preview request preserves raw payload
- **WHEN** a caller supplies a JSON-safe object whose `payload` is a string that is non-empty after trimming
- **THEN** the adapter forwards only the original untrimmed `payload` string

#### Scenario: Apply request uses the public action set
- **WHEN** a caller supplies a valid payload and an action of `use-imported` or `merge-non-conflicting`
- **THEN** the adapter forwards the canonical payload and action without unknown fields

#### Scenario: Invalid request is rejected before the port
- **WHEN** a request is not a JSON-safe object, has a non-string or blank payload, or has an unsupported apply action
- **THEN** the client rejects it with `invalid_request` before resolving or invoking the legacy port

### Requirement: Stable adapter result and error behavior

The in-process adapter SHALL invoke narrow optional preview and apply ports, normalize successful results as JSON objects, and use stable client error categories.

#### Scenario: Domain import results remain successful
- **WHEN** preview returns conflicts or warnings or apply returns a receipt or plural diagnostics in a JSON-safe object
- **THEN** the adapter returns the normalized object without converting domain data into client failure

#### Scenario: Adapter failures use stable categories
- **WHEN** a port is missing, throws a known client error, reports storage busy, throws an ordinary exception, or returns a non-object result
- **THEN** the adapter maps the outcome respectively to `unavailable`, the preserved client error, `storage_busy`, or `internal`

### Requirement: Workbench routes Tag import through the client

The Workbench SHALL lazily resolve the default Synthesis client inside each Tag import single-flight closure and SHALL not directly resolve the legacy service from the preview or apply branches.

#### Scenario: Preview aliases retain shared orchestration
- **WHEN** the Workbench receives `importTagVocabulary` or `previewTagVocabularyImport` with a valid primitive string payload
- **THEN** it calls `client.tags.previewTagVocabularyImport` with the original payload under the `previewTagVocabularyImport` operation and empty single-flight arguments

#### Scenario: Apply retains action-scoped orchestration
- **WHEN** the Workbench receives `applyTagVocabularyImport` with a valid payload and supported normalized action
- **THEN** it calls `client.tags.applyTagVocabularyImport` with the original payload and action while retaining `{ action }` as the single-flight arguments

#### Scenario: Invalid host input does not resolve the client
- **WHEN** the preview payload is not a non-blank primitive string or the apply payload or action is invalid
- **THEN** the Workbench skips client resolution and refreshes the active cached surface without a service read

#### Scenario: Import commands retain UI behavior
- **WHEN** preview or apply returns normally
- **THEN** the Workbench invalidates only the Tags surface without confirmation, deferred start, progress callback, streaming, or diagnostic transformation

### Requirement: Service boundary remains stable

The migration SHALL preserve the existing Tag import domain ownership and Synthesis service boundary inventory.

#### Scenario: Existing domain state remains service-owned
- **WHEN** preview or apply is invoked through the default in-process composition
- **THEN** the existing service continues to own payload parsing, preview state, autosync, and successful-apply state clearing

#### Scenario: Repository boundary checks remain stable
- **WHEN** repository boundary checks run after the migration
- **THEN** the Synthesis service still exposes 125 public methods and has four approved direct consumers
