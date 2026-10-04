# Spec Delta

## ADDED Requirements

### Requirement: Shared search contracts SHALL have TypeScript and Rust parity
The canonical sidecar protocol contract set SHALL define the strict shared search request, result, evidence passage, source identity, location, coverage, issue, and cursor-boundary DTOs for TypeScript and Rust.

#### Scenario: Valid search corpus is rebuilt
- **WHEN** TypeScript and Rust rebuild the same valid search request and result fixtures
- **THEN** both accept the same bounded values and preserve the same public fields and semantics

#### Scenario: Invalid search corpus is rebuilt
- **WHEN** either implementation receives unknown fields, malformed scope identities, invalid limits, invalid ranges, or unbounded issue/coverage values
- **THEN** both reject the fixture under the same stable invalid-contract category

#### Scenario: Unicode location corpus is rebuilt
- **WHEN** both implementations process evidence ranges over multilingual supplementary-plane text
- **THEN** they agree on UTF-16 half-open boundaries and reject ranges that split a Unicode character
