## MODIFIED Requirements

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
