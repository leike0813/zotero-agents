# Spec Delta

## ADDED Requirements

### Requirement: CLI SHALL expose bounded Synthesis evidence search
The Rust CLI command `synthesis evidence search` SHALL invoke remote capability `synthesis.search_evidence` with the shared evidence-search request and result contract while preserving the existing JSON-container interpretation of `--query`.

#### Scenario: CLI evidence search is valid
- **WHEN** a caller supplies a valid JSON `--query` container with a non-empty query and optional scope or paging values
- **THEN** the CLI sends the contained plain query and declared fields through the existing Host Bridge capability call path
- **AND** it returns the typed status, method, coverage, issues, cursor, and exact-or-null total

#### Scenario: CLI evidence search is invalid
- **WHEN** the JSON container, query, scope, or paging values are invalid
- **THEN** the CLI returns the established validation error without dispatching the capability
