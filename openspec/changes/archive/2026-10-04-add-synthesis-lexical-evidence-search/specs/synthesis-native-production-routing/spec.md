# Spec Delta

## ADDED Requirements

### Requirement: Evidence search SHALL route through the current Rust runtime
The native production route for `searchEvidence` SHALL invoke the retrieval application in the existing Synthesis runtime and use only the declared bounded private Host source-facts port for Zotero-owned content.

#### Scenario: Production evidence search is dispatched
- **WHEN** the verified native client dispatches a valid evidence-search request
- **THEN** the current runtime routes it to the retrieval application and returns its typed result
- **AND** no separate process, legacy service, or client-side search fallback is started

#### Scenario: Host source facts are requested
- **WHEN** the retrieval application needs current Library source facts or passage verification
- **THEN** the runtime uses the bounded authenticated reverse-Host port and Rust receives only typed facts or content
- **AND** Zotero objects, UI authority, and local paths remain within the Host adapter

#### Scenario: Route is declared without reachable behavior
- **WHEN** the route is inventoried as available but cannot perform bounded source enumeration and verified passage reads
- **THEN** it is not considered behaviorally ready and returns the stable unavailable or limited outcome
