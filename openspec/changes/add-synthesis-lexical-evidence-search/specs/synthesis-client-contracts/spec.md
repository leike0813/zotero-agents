# Spec Delta

## ADDED Requirements

### Requirement: Evidence search SHALL have a concrete grouped client operation
The grouped `SynthesisClient` SHALL expose `searchEvidence` using package-owned request and result types from the shared search contract, and native composition SHALL keep reverse-Host source-facts transport private.

#### Scenario: Caller invokes evidence search
- **WHEN** a caller invokes `SynthesisClient.searchEvidence` with a valid request
- **THEN** the operation returns the typed shared evidence-search result through the production client path

#### Scenario: Private source transport crosses native composition
- **WHEN** the Rust application requests source facts or a verified source passage
- **THEN** native composition resolves the private Host port and returns only the typed public search result to the caller
- **AND** transport locators, local paths, credentials, and Host objects do not escape
