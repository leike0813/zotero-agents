# Spec Delta

## ADDED Requirements

### Requirement: Host Bridge SHALL expose Synthesis evidence search
The authenticated Host Bridge capability `synthesis.search_evidence` SHALL validate the shared evidence-search request and project the typed `SynthesisClient.searchEvidence` result without implementing a second retrieval path. This read-only operation SHALL require no per-call Zotero UI approval.

#### Scenario: Remote evidence search succeeds
- **WHEN** an authenticated caller supplies a valid bounded evidence-search request
- **THEN** Host Bridge dispatches through the native Synthesis client and returns the shared result DTO
- **AND** the response contains no local path, Zotero object, private Host transport field, or public score

#### Scenario: Remote evidence search request is invalid
- **WHEN** the request violates the shared query, scope, or paging contract
- **THEN** Host Bridge returns the established structured invalid-capability error before Synthesis dispatch

#### Scenario: Native retrieval is unavailable
- **WHEN** the native retrieval route or source-owner read is unavailable
- **THEN** Host Bridge preserves the typed unavailable or limited outcome and does not fall back to a second search implementation
