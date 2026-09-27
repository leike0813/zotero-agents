# synthesis-native-tag-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-tag-surface. Update Purpose after archive.
## Requirements
### Requirement: Tag operations SHALL preserve the complete public contract

The native surface SHALL implement exactly the nineteen Tag operations assigned by the R9a operation-ownership matrix. Vocabulary, staged suggestion, audit, import, builtin-policy, validation, index, and regulator-export requests and results MUST remain compatible. `client.listStagedTagSuggestions` SHALL accept no paging arguments and SHALL return the complete deterministically ordered `SynthesisTagStagedSuggestion[]`, while any repository/application paging remains private to the Rust adapter.

#### Scenario: A Tag read or local mutation is requested
- **WHEN** its public request is valid for the current vocabulary or staged basis
- **THEN** Rust returns or persists the compatible typed result
- **AND** it does not expose internal hashes or full-state payloads not required by the public method

#### Scenario: Staged suggestions span multiple internal pages
- **WHEN** more than one hundred staged suggestions exist
- **THEN** `client.listStagedTagSuggestions` drains every internal page and returns one complete stable array

#### Scenario: Internal staged cursor does not advance
- **WHEN** a nonterminal page repeats a cursor or otherwise makes no progress
- **THEN** the native adapter fails with a stable invalid-response error instead of looping or returning a partial array

### Requirement: Zotero tag effects SHALL be explicit and recoverable

Any Zotero tag mutation SHALL use only the declared preconditioned reverse-Host effect port. Rust SHALL persist effect intent and reconcile typed receipts so retries and restarts do not duplicate successful effects.

#### Scenario: Host applies an effect and transport fails afterward
- **WHEN** Rust cannot observe the first response
- **THEN** recovery uses the stable effect identity to obtain or reconcile the receipt
- **AND** it does not blindly apply the tag mutation again

### Requirement: Import and readiness SHALL be evidence-backed

Import apply SHALL bind to its preview digest and current vocabulary basis. Every owned operation SHALL pass differential, CAS, restart, Host-failure, bounds, and deadline fixtures before ready-roster admission.

#### Scenario: Import preview is stale
- **WHEN** vocabulary state changes before apply
- **THEN** apply fails with the stable conflict result without modifying vocabulary or Zotero tags

#### Scenario: A Tag handler lacks effect evidence
- **WHEN** its local result passes but required Host-effect or recovery parity is absent
- **THEN** the operation remains not ready

### Requirement: Native Tags surface SHALL recover from canonical case collisions

The native Tags surface SHALL preserve its existing public contracts while grouped promotion prevents new case collisions and startup repair restores historical collided aggregates without read-time mutation.

#### Scenario: Grouped promotion is read back through the native surface
- **WHEN** one request promotes staged variants that differ only by case
- **THEN** subsequent vocabulary and Tags workbench reads SHALL return the single winning canonical spelling
- **AND** public request and response DTOs SHALL remain unchanged

#### Scenario: Sidecar opens a historical collided store
- **WHEN** a real sidecar process starts against a store containing canonical case variants
- **THEN** startup SHALL attempt repair before publishing readiness
- **AND** successful repair SHALL allow vocabulary and Tags workbench reads in that process and after a cold reopen

#### Scenario: Startup repair cannot commit
- **WHEN** repair fails for a historical collided store
- **THEN** the sidecar SHALL still publish readiness
- **AND** the public read MAY retain its existing invalid-request failure until a later startup repairs the store

### Requirement: Public staged-tag promotion SHALL support the public selection bound

The native Tag surface SHALL accept a valid staged-tag selection up to the existing public protocol bound. Internal effect batching MAY remain smaller, but batching SHALL be transparent to the public operation and SHALL preserve one basis-checked logical mutation.

#### Scenario: More than one hundred staged suggestions are selected

- **WHEN** a valid request selects 264 staged suggestions under one current vocabulary and staged revision
- **THEN** the operation promotes all eligible selections or reports the existing conflict/engine result
- **AND** it does not fail solely because the selection exceeds an internal effect batch size.

#### Scenario: A selection exceeds the public bound

- **WHEN** a request exceeds the existing public maximum
- **THEN** the public request validator rejects it before application mutation
- **AND** no vocabulary or staged state changes.

