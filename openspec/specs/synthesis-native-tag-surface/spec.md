# synthesis-native-tag-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-tag-surface. Update Purpose after archive.
## Requirements
### Requirement: Tag operations SHALL preserve the complete public contract

The native surface SHALL implement exactly the nineteen Tag operations assigned by the R9a operation-ownership matrix. Vocabulary, staged suggestion, audit, import, builtin-policy, validation, index, and regulator-export requests and results MUST remain compatible.

#### Scenario: A Tag read or local mutation is requested
- **WHEN** its public request is valid for the current vocabulary or staged basis
- **THEN** Rust returns or persists the compatible typed result
- **AND** it does not expose internal hashes or full-state payloads not required by the public method

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

